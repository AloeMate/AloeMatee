from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from typing import List, Optional
import shutil
from pathlib import Path
import logging
import uuid
import traceback

from app.schemas import (
    PredictResponse, 
    DiseasesResponse, 
    DiseaseInfo,
    TreatmentRequest,
    TreatmentResponse,
    FeedbackRequest,
    FeedbackResponse,
    FeedbackStatsResponse
)
from app.services.disease_prediction import disease_predictor
from app.services.treatment_retrieval import treatment_retriever
from app.services.inference import get_inference_service
from app.services.feedback import get_feedback_db
from app.services.rate_limiter import get_rate_limiter
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["prediction"])

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/predict", response_model=PredictResponse)
async def predict_disease(
    request: Request,
    image1: Optional[UploadFile] = File(None),
    image2: Optional[UploadFile] = File(None),
    image3: Optional[UploadFile] = File(None)
):
    """
    Predict disease from 1-3 uploaded plant images
    
    **Production Hardening:**
    - Rate limited to 30 requests/minute per IP
    - Max 10MB per image
    - Only jpg/jpeg/png allowed
    - Robust error handling with safe fallback
    
    Args:
        image1: First image (required) - close-up of lesion/affected area
        image2: Second image (optional) - whole plant view
        image3: Third image (optional) - base/soil view
        
    Returns:
        PredictResponse with predictions and confidence status
        
    Raises:
        429: Rate limit exceeded
        400: Invalid input (bad image, size, type)
        500: Server error (safe fallback with request_id)
    """
    # Generate request ID for error tracking
    request_id = str(uuid.uuid4())
    
    # Rate limiting check (if enabled)
    if settings.RATE_LIMIT_ENABLED:
        rate_limiter = get_rate_limiter()
        client_ip = request.client.host if request.client else "unknown"
        
        is_allowed, remaining, retry_after = rate_limiter.is_allowed(client_ip)
        
        if not is_allowed:
            logger.warning(f"Rate limit exceeded for IP {client_ip}, retry after {retry_after}s")
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests. Please try again in {retry_after} seconds.",
                    "retry_after_seconds": retry_after,
                    "limit": f"{settings.RATE_LIMIT_REQUESTS} requests per {settings.RATE_LIMIT_WINDOW} seconds"
                },
                headers={"Retry-After": str(retry_after)}
            )
        
        logger.debug(f"Rate limit check passed for {client_ip}, remaining: {remaining}")
    
    # Collect provided images
    images = []
    for img in [image1, image2, image3]:
        if img is not None:
            images.append(img)
    
    if len(images) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one image is required (image1, image2, or image3)"
        )
    
    if len(images) > 3:
        raise HTTPException(
            status_code=400,
            detail="Maximum 3 images allowed"
        )
    
    saved_paths = []
    
    try:
        logger.info(f"Request {request_id}: Received prediction request with {len(images)} image(s)")
        
        # EARLY VALIDATION: Check all files before saving
        for idx, file in enumerate(images):
            # Validate content type
            if not file.content_type or not file.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail=f"File {idx + 1} must be an image (received: {file.content_type})"
                )
            
            # Validate file extension
            file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
            if file_ext not in settings.ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {idx + 1} extension must be one of: {', '.join(settings.ALLOWED_EXTENSIONS)} (received: .{file_ext})"
                )
        
        # Save and validate file size
        for idx, file in enumerate(images):
            file_path = UPLOAD_DIR / f"{request_id}_{idx}_{file.filename}"
            
            # Read file content to check size before saving
            content = await file.read()
            file_size = len(content)
            
            # Validate size BEFORE saving
            if file_size > settings.MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=413,  # Payload Too Large
                    detail={
                        "error": "FILE_TOO_LARGE",
                        "message": f"File {idx + 1} exceeds maximum size",
                        "file_size_mb": round(file_size / (1024*1024), 2),
                        "max_size_mb": round(settings.MAX_UPLOAD_SIZE / (1024*1024), 2),
                        "filename": file.filename
                    }
                )
            
            if file_size == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {idx + 1} is empty"
                )
            
            # Save to disk
            with file_path.open("wb") as buffer:
                buffer.write(content)
            
            logger.debug(f"Validated image {idx + 1}: {file.filename}, size={file_size / 1024:.1f}KB")
            saved_paths.append(file_path)
        
        # Perform prediction with error handling
        try:
            result = await disease_predictor.predict_multiple(
                [str(path) for path in saved_paths]
            )
        except Exception as pred_error:
            # Inference error - return safe fallback
            logger.error(f"Request {request_id}: Inference failed - {pred_error}")
            logger.error(traceback.format_exc())
            
            # Return safe fallback response
            from app.schemas import DiseasePrediction
            return PredictResponse(
                request_id=request_id,
                num_images_received=len(images),
                predictions=[
                    DiseasePrediction(
                        disease_id="error",
                        disease_name="Inference Error",
                        prob=0.0
                    )
                ],
                confidence_status="LOW",
                recommended_next_step="RETAKE",
                symptoms_summary="Unable to analyze due to technical error.",
                retake_message="Unable to analyze image due to technical error."
            )
        
        # Log prediction to feedback database
        try:
            feedback_db = get_feedback_db()
            feedback_db.log_prediction(
                request_id=result.request_id,
                num_images=len(saved_paths),
                predictions=[
                    {
                        "disease_id": p.disease_id,
                        "disease_name": p.disease_name,
                        "prob": p.prob
                    }
                    for p in result.predictions[:3]
                ],
                confidence_status=result.confidence_status,
                recommended_next_step=result.recommended_next_step or "",
                retake_message=result.retake_message,
                quality_issues=None
            )
            logger.debug(f"Logged prediction {result.request_id} to feedback database")
        except Exception as log_error:
            # Don't fail the request if logging fails
            logger.error(f"Failed to log prediction: {log_error}")
        
        logger.info(f"Request {result.request_id}: Success - {len(result.predictions)} predictions, confidence={result.confidence_status}")
        
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, rate limits)
        raise
    except Exception as e:
        # Catch-all for unexpected errors - return safe response
        logger.error(f"Request {request_id}: Unexpected error - {e}")
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": "SERVER_ERROR",
                "message": "An unexpected error occurred while processing your request.",
                "request_id": request_id,
                "suggestion": "Please try again. If the issue persists, contact support with this request ID."
            }
        )
    finally:
        # Always clean up temporary files
        for file_path in saved_paths:
            try:
                if file_path.exists():
                    file_path.unlink()
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup {file_path}: {cleanup_error}")


@router.get("/diseases", response_model=DiseasesResponse)
async def get_diseases():
    """
    Get list of all supported diseases
    
    Returns:
        DiseasesResponse with list of diseases
    """
    diseases = disease_predictor.get_all_diseases()
    
    disease_info_list = [
        DiseaseInfo(
            disease_id=d["disease_id"],
            disease_name=d["disease_name"],
            description=d["description"],
            severity=d["severity"],
            common_symptoms=d["common_symptoms"]
        )
        for d in diseases
    ]
    
    return DiseasesResponse(
        diseases=disease_info_list,
        count=len(disease_info_list)
    )


@router.post("/treatment", response_model=TreatmentResponse)
async def get_treatment(request: TreatmentRequest):
    """
    Get CURATED treatment information for a specific disease
    
    SAFETY-CRITICAL: This endpoint ONLY returns expert-reviewed, validated guidance.
    NO AI generation. NO hallucination. If curated knowledge is not available,
    returns safe fallback with expert consultation guidance.
    
    Args:
        request: TreatmentRequest with disease_id and mode (SCIENTIFIC or AYURVEDIC)
        
    Returns:
        TreatmentResponse with detailed treatment steps and citations
        
    Raises:
        HTTPException 404: When curated knowledge is not available (includes safe fallback message)
    """
    treatment = treatment_retriever.get_treatment(
        disease_id=request.disease_id,
        mode=request.mode
    )
    
    if not treatment:
        # SAFETY: Return informative error with expert consultation guidance
        # DO NOT attempt to generate treatment advice
        raise HTTPException(
            status_code=404,
            detail={
                "error": "CURATED_KNOWLEDGE_NOT_AVAILABLE",
                "message": f"We do not have expert-reviewed treatment guidance for '{request.disease_id}' in {request.mode} mode.",
                "safe_fallback": {
                    "recommendation": "Please consult with a plant disease specialist or horticulturist for accurate diagnosis and treatment recommendations.",
                    "why_no_guidance": "To ensure your safety and the health of your plants, we only provide treatment advice that has been reviewed by experts and backed by scientific research or validated traditional knowledge.",
                    "what_you_can_do": [
                        "Take clear, well-lit photos of the affected plant",
                        "Note any recent changes in care, watering, or environment",
                        "Consult with a local nursery or agricultural extension office",
                        "Search for peer-reviewed literature on the specific disease",
                        "Consider isolating the affected plant to prevent spread"
                    ],
                    "emergency_resources": [
                        "Local agricultural extension offices",
                        "Certified plant disease specialists",
                        "University horticulture departments",
                        "Professional plant pathology labs"
                    ]
                }
            }
        )
    
    return treatment


@router.get("/model_info")
async def get_model_info():
    """
    Get model metadata and configuration
    
    Returns information about the active inference model including:
    - Model type (pytorch, placeholder, etc.)
    - Model architecture
    - Class names and count
    - Calibration parameters and thresholds
    - Training metrics
    - Export information
    """
    inference_service = get_inference_service()
    model_info = inference_service.get_model_info()
    
    return {
        "status": "success",
        "model": model_info
    }


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackRequest):
    """
    Submit user feedback for a prediction
    
    This endpoint allows users to provide feedback on predictions to improve
    future model performance. Feedback includes:
    - Whether the prediction was correct or not
    - If incorrect, what the correct disease was
    - Optional notes about the situation
    
    Args:
        feedback: FeedbackRequest with request_id, selected_disease_id, 
                 was_prediction_helpful, and optional notes
    
    Returns:
        FeedbackResponse with success status and message
    """
    try:
        feedback_db = get_feedback_db()
        
        # Verify the request_id exists
        prediction = feedback_db.get_prediction(feedback.request_id)
        if not prediction:
            raise HTTPException(
                status_code=404,
                detail=f"Prediction with request_id '{feedback.request_id}' not found"
            )
        
        # Submit feedback
        success = feedback_db.submit_feedback(
            request_id=feedback.request_id,
            selected_disease_id=feedback.selected_disease_id,
            was_prediction_helpful=feedback.was_prediction_helpful,
            notes=feedback.notes
        )
        
        if success:
            logger.info(f"Feedback submitted for request {feedback.request_id}: helpful={feedback.was_prediction_helpful}, disease={feedback.selected_disease_id}")
            return FeedbackResponse(
                success=True,
                message="Thank you for your feedback! This helps us improve our model."
            )
        else:
            logger.error(f"Failed to submit feedback for request {feedback.request_id}")
            raise HTTPException(
                status_code=500,
                detail="Failed to submit feedback. Please try again."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing feedback: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing feedback: {str(e)}"
        )


@router.get("/feedback/stats", response_model=FeedbackStatsResponse)
async def get_feedback_stats():
    """
    Get aggregated feedback statistics
    
    Returns statistics about user feedback including:
    - Total predictions and feedback count
    - Feedback rate (% of predictions with feedback)
    - Helpful rate (% of feedback marked as helpful)
    - Confidence distribution (HIGH/MEDIUM/LOW counts)
    - Common corrections (most frequent misclassifications)
    
    This endpoint is useful for monitoring model performance and
    identifying areas for improvement.
    
    Returns:
        FeedbackStatsResponse with aggregated statistics
    """
    try:
        feedback_db = get_feedback_db()
        stats = feedback_db.get_feedback_stats()
        
        return FeedbackStatsResponse(
            total_predictions=stats["total_predictions"],
            total_feedback=stats["total_feedback"],
            feedback_rate=stats["feedback_rate"],
            helpful_rate=stats["helpful_rate"],
            confidence_distribution=stats["confidence_distribution"],
            common_corrections=stats["common_corrections"]
        )
    except Exception as e:
        logger.error(f"Error retrieving feedback stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving feedback statistics: {str(e)}"
        )
