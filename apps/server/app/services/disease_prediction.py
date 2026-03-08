"""
Disease prediction service - High-level orchestration layer

Uses DiseaseInferenceService for model predictions and adds business logic
(confidence thresholds, retake messages, symptoms summary, etc.)
"""
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from PIL import Image

from app.schemas import DiseasePrediction, PredictResponse
from app.services.inference import get_inference_service
from app.services.image_quality import check_image_quality, ImageQualityIssue

logger = logging.getLogger(__name__)


class DiseasePredictor:
    """
    High-level disease prediction orchestrator
    
    Separates business logic from ML inference:
    - Inference service: Pure ML predictions
    - This class: Confidence thresholds, retake messages, formatting
    """
    
    def __init__(self):
        # Get inference service (can be swapped without changing this code)
        self.inference_service = get_inference_service()
        self.diseases = self.inference_service.get_supported_diseases()
    
    def _load_images_as_bytes(self, image_paths: List[str]) -> List[bytes]:
        """Load image files as bytes for inference"""
        images_bytes = []
        for path in image_paths:
            with open(path, "rb") as f:
                images_bytes.append(f.read())
        return images_bytes
    
    def _check_if_aloe_vera(self, predictions: List[DiseasePrediction]) -> tuple[bool, Optional[str]]:
        """
        Detect if the image might not be an aloe vera plant
        
        Strategy: If predictions are evenly distributed across multiple classes,
        the model is confused, which often indicates non-aloe vera input
        
        Args:
            predictions: List of disease predictions with probabilities
            
        Returns:
            Tuple of (is_likely_aloe_vera, warning_message)
        """
        if not predictions:
            return False, "No predictions available"
        
        # Get top predictions (sorted by probability)
        sorted_preds = sorted(predictions, key=lambda x: x.prob, reverse=True)
        top_prob = sorted_preds[0].prob
        
        # Check if probabilities are evenly distributed (model is confused)
        if len(sorted_preds) >= 3:
            second_prob = sorted_preds[1].prob
            third_prob = sorted_preds[2].prob
            
            # If top 3 predictions are within 20% of each other, model is very uncertain
            prob_range = top_prob - third_prob
            if prob_range < 0.20 and top_prob < 0.50:
                return False, (
                    "⚠️ WARNING: This doesn't appear to be an aloe vera plant!\n\n"
                    "The AI model is trained specifically for aloe vera diseases and cannot "
                    "identify other plants (like mango, tomato, etc.).\n\n"
                    "Please ensure you're photographing an ALOE VERA plant. "
                    "The model detected very similar probabilities across multiple disease classes, "
                    "which typically means the input is not an aloe vera plant."
                )
        
        # Additional check: If highest confidence is still very low with distributed predictions
        if top_prob < 0.35 and len(sorted_preds) >= 2:
            second_prob = sorted_preds[1].prob
            if abs(top_prob - second_prob) < 0.10:  # Very close probabilities
                return False, (
                    "⚠️ The image doesn't match aloe vera disease patterns.\n\n"
                    "This app is designed specifically for aloe vera plants. "
                    "If you're trying to identify diseases in other plants (mango, banana, etc.), "
                    "please use a different plant disease detection app.\n\n"
                    "If this IS an aloe vera plant, try taking clearer photos with better lighting."
                )
        
        return True, None
    
    def _determine_confidence_status(self, max_prob: float, num_images: int, predictions: List[DiseasePrediction]) -> tuple[str, str, Optional[str]]:
        """Determine confidence status and recommended action
        
        Uses thresholds from calibration config if available
        
        Args:
            max_prob: Maximum probability from predictions
            num_images: Number of images provided
            predictions: Full list of predictions for additional validation
            
        Returns:
            Tuple of (confidence_status, recommended_next_step, retake_message)
        """
        # TEMPORARILY DISABLED: Skip aloe vera check to debug confidence issues
        # First check if this might not be an aloe vera plant
        # is_aloe_vera, warning_msg = self._check_if_aloe_vera(predictions)
        # if not is_aloe_vera:
        #     return "LOW", "RETAKE", warning_msg
        
        # Get thresholds from model info
        model_info = self.inference_service.get_model_info()
        thresholds = model_info.get("calibration", {}).get("thresholds", {"HIGH": 0.80, "MEDIUM": 0.60})
        high_threshold = thresholds.get("HIGH", 0.80)
        medium_threshold = thresholds.get("MEDIUM", 0.60)
        
        if max_prob >= high_threshold:
            return "HIGH", "SHOW_TREATMENT", None
        elif max_prob >= medium_threshold:
            return "MEDIUM", "SHOW_TREATMENT", None
        else:
            # Generate retake message for LOW confidence
            retake_message = self._generate_retake_message(max_prob, num_images)
            return "LOW", "RETAKE", retake_message
    
    def _generate_retake_message(self, confidence: float, num_images: int) -> str:
        """Generate human-readable, encouraging message for retaking photos"""
        
        # Start with confidence explanation
        if confidence < 0.3:
            intro = "The model couldn't identify clear disease patterns in your photos."
        elif confidence < 0.5:
            intro = "The model detected some patterns but isn't confident enough for a reliable diagnosis."
        else:
            intro = f"Confidence is moderate ({confidence:.0%}), but better photos will improve accuracy."
        
        # Add specific actionable tips
        tips = []
        tips.append("📸 Use bright, natural daylight (avoid harsh direct sun)")
        tips.append("🎯 Tap to focus on affected areas and wait for sharp image")
        tips.append("📏 Hold camera 6-12 inches from the plant")
        
        if num_images < 3:
            tips.append(f"📷 Take all 3 recommended photos (you provided {num_images})")
        
        tips.append("🧹 Clean camera lens for clearer capture")
        tips.append("🖼️ Remove background clutter and shadows")
        
        return f"{intro} Tips for better results: {' • '.join(tips)}"
    
    def _generate_symptoms_summary(self, predictions: List[DiseasePrediction]) -> str:
        """Generate symptom summary based on top prediction"""
        top_disease_id = predictions[0].disease_id
        disease_data = next((d for d in self.diseases if d["disease_id"] == top_disease_id), None)
        
        if disease_data and disease_data.get("common_symptoms"):
            symptoms = disease_data["common_symptoms"][:3]  # Top 3 symptoms
            return f"Common symptoms: {', '.join(symptoms)}"
        
        return "Analysis based on visual characteristics of uploaded images."
    
    async def predict(self, image_path: str) -> PredictResponse:
        """Predict disease from single image"""
        return await self.predict_multiple([image_path])
    
    async def predict_multiple(self, image_paths: List[str]) -> PredictResponse:
        """
        Predict disease from multiple images
        
        Args:
            image_paths: List of paths to uploaded images (1-3)
            
        Returns:
            PredictResponse with predictions and confidence status
        """
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        logger.info(f"Request {request_id}: Processing {len(image_paths)} images")
        
        # Check image quality before inference
        for i, image_path in enumerate(image_paths):
            try:
                image = Image.open(image_path)
                quality_result = check_image_quality(image)
                
                # Log quality metrics for debugging
                logger.info(f"Request {request_id}: Image {i+1} quality - "
                          f"Resolution: {quality_result.resolution}, "
                          f"Blur score: {quality_result.blur_score:.2f}, "
                          f"Brightness: {quality_result.brightness_score:.2f}, "
                          f"Status: {quality_result.issue.value}")
                
                if not quality_result.is_acceptable:
                    logger.warning(f"Request {request_id}: Image {i+1} failed quality check: {quality_result.issue.value}")
                    
                    # Return LOW confidence response with quality issue message
                    # Create placeholder predictions (required by schema)
                    placeholder_predictions = [
                        DiseasePrediction(
                            disease_id=disease["disease_id"],
                            disease_name=disease["name"],
                            prob=0.0
                        )
                        for disease in self.diseases[:3]  # Top 3
                    ]
                    
                    return PredictResponse(
                        request_id=request_id,
                        num_images_received=len(image_paths),
                        predictions=placeholder_predictions,
                        confidence_status="LOW",
                        recommended_next_step="RETAKE",
                        symptoms_summary="Unable to analyze due to image quality issues.",
                        retake_message=quality_result.get_user_message()
                    )
            except Exception as e:
                logger.error(f"Request {request_id}: Error checking quality of image {i+1}: {e}")
                # Continue with inference on error to not crash
        
        # Load images as bytes
        images_bytes = self._load_images_as_bytes(image_paths)
        
        # Call inference service (this is where ML model runs)
        inference_results = self.inference_service.predict(images_bytes)
        
        # Convert to schema format
        predictions = [
            DiseasePrediction(
                disease_id=result.disease_id,
                disease_name=result.disease_name,
                prob=result.confidence
            )
            for result in inference_results
        ]
        
        # Compute confidence as max(probabilities)
        max_prob = max(pred.prob for pred in predictions)
        
        # Determine confidence and recommendation (business logic) - includes aloe vera detection
        confidence_status, recommended_next_step, retake_message = self._determine_confidence_status(
            max_prob, len(image_paths), predictions
        )
        
        logger.info(f"Request {request_id}: Confidence={confidence_status} (max_prob={max_prob:.3f}), Action={recommended_next_step}")
        
        # Generate symptoms summary
        symptoms_summary = self._generate_symptoms_summary(predictions)
        
        return PredictResponse(
            request_id=request_id,
            num_images_received=len(image_paths),
            predictions=predictions,
            confidence_status=confidence_status,
            recommended_next_step=recommended_next_step,
            symptoms_summary=symptoms_summary,
            retake_message=retake_message
        )
    
    def get_all_diseases(self) -> List[dict]:
        """Return all diseases supported by the model"""
        return self.diseases


# Global instance
disease_predictor = DiseasePredictor()
