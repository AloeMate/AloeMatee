"""
Harvest Assessment API (Component 4)

No-ML implementation using card-based leaf measurement.
Optional ML-based assessment available for demo purposes.
Provides harvest readiness assessment based on leaf size measurements.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import json
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from app.services.harvest_ml import harvest_ml_service

router = APIRouter(prefix="/api/v4", tags=["harvest"])

# Configuration
MATURITY_CONFIG = {
    "L1": 18.0,  # NOT_MATURE threshold (< L1)
    "L2": 25.0,  # MATURE threshold (>= L2)
}

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB


# ==================== Models ====================

class LeafMeasurement(BaseModel):
    """Single leaf measurement"""
    length_cm: float = Field(..., gt=0, description="Leaf length in centimeters")
    width_cm: Optional[float] = Field(None, gt=0, description="Leaf width in centimeters (optional)")


class HarvestAssessmentRequest(BaseModel):
    """Request body for harvest assessment"""
    measurements: List[LeafMeasurement] = Field(..., min_items=1, max_items=10)
    card_width_mm: float = Field(85.6, description="Reference card width in mm (default: business card)")
    card_height_mm: float = Field(54.0, description="Reference card height in mm (default: business card)")


class HarvestStatus(BaseModel):
    """Harvest readiness status"""
    status: str = Field(..., description="Ready, Nearly Ready, or Not Ready")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score")
    message: str = Field(..., description="Detailed status message")
    color: str = Field(..., description="Hex color for UI")
    icon: str = Field(..., description="Emoji icon")


class QualityIndicators(BaseModel):
    """Quality assessment indicators"""
    gel_content_estimate: str
    maturity_level: str
    recommended_action: str
    harvest_readiness_score: float = Field(..., ge=0, le=100)


class MarketInsights(BaseModel):
    """Market price and revenue estimates"""
    price_per_leaf_min: float
    price_per_leaf_max: float
    estimated_revenue_min: float
    estimated_revenue_max: float
    currency: str = "USD"
    note: str


class HarvestAssessmentResponse(BaseModel):
    """Complete harvest assessment response"""
    timestamp: str
    leaf_count: int
    avg_length_cm: float
    max_length_cm: float
    min_length_cm: float
    std_deviation: float
    harvest_status: HarvestStatus
    quality_indicators: QualityIndicators
    market_insights: MarketInsights
    recommendations: List[str]


# ==================== Helper Functions ====================

def calculate_harvest_status(avg_length: float) -> HarvestStatus:
    """Determine harvest readiness based on average leaf length"""
    if avg_length >= 25:
        return HarvestStatus(
            status="Ready",
            confidence=0.95,
            message="Your aloe vera leaves are mature and ready for harvest! Optimal gel content expected.",
            color="#4CAF50",
            icon="✅"
        )
    elif avg_length >= 20:
        return HarvestStatus(
            status="Nearly Ready",
            confidence=0.85,
            message="Leaves are growing well. Wait 2-3 more weeks for optimal harvest and maximum gel content.",
            color="#FF9800",
            icon="⏳"
        )
    elif avg_length >= 15:
        return HarvestStatus(
            status="Not Ready",
            confidence=0.90,
            message="Leaves are still young. Wait 4-6 weeks until they reach 20-25cm for best gel content.",
            color="#F44336",
            icon="❌"
        )
    else:
        return HarvestStatus(
            status="Too Young",
            confidence=0.95,
            message="Leaves are too small for harvest. Continue care and allow at least 8-12 weeks of growth.",
            color="#D32F2F",
            icon="⛔"
        )


def calculate_quality_indicators(avg_length: float, std_deviation: float) -> QualityIndicators:
    """Calculate quality metrics based on measurements"""
    
    # Gel content estimate
    if avg_length >= 30:
        gel_content = "High (80-90%)"
        readiness_score = 95
    elif avg_length >= 25:
        gel_content = "Good (70-80%)"
        readiness_score = 85
    elif avg_length >= 20:
        gel_content = "Medium (60-70%)"
        readiness_score = 70
    elif avg_length >= 15:
        gel_content = "Low (50-60%)"
        readiness_score = 50
    else:
        gel_content = "Very Low (40-50%)"
        readiness_score = 30
    
    # Maturity level
    if avg_length >= 25:
        maturity = "Mature"
    elif avg_length >= 18:
        maturity = "Maturing"
    else:
        maturity = "Young"
    
    # Recommended action
    if avg_length >= 25:
        action = "Harvest Now - Optimal Time"
    elif avg_length >= 20:
        action = "Wait 2-3 Weeks"
    elif avg_length >= 15:
        action = "Wait 4-6 Weeks"
    else:
        action = "Wait 8-12 Weeks"
    
    # Adjust score based on consistency (lower std deviation = better)
    if std_deviation < 2:
        readiness_score = min(100, readiness_score + 5)
    elif std_deviation > 5:
        readiness_score = max(0, readiness_score - 10)
    
    return QualityIndicators(
        gel_content_estimate=gel_content,
        maturity_level=maturity,
        recommended_action=action,
        harvest_readiness_score=readiness_score
    )


def calculate_market_insights(avg_length: float, leaf_count: int) -> MarketInsights:
    """Calculate market price estimates"""
    
    # Price per leaf based on size (USD)
    if avg_length >= 30:
        price_min, price_max = 3.00, 4.50
    elif avg_length >= 25:
        price_min, price_max = 2.50, 3.50
    elif avg_length >= 20:
        price_min, price_max = 1.80, 2.50
    elif avg_length >= 15:
        price_min, price_max = 1.20, 1.80
    else:
        price_min, price_max = 0.50, 1.20
    
    # Calculate total revenue
    revenue_min = price_min * leaf_count
    revenue_max = price_max * leaf_count
    
    return MarketInsights(
        price_per_leaf_min=round(price_min, 2),
        price_per_leaf_max=round(price_max, 2),
        estimated_revenue_min=round(revenue_min, 2),
        estimated_revenue_max=round(revenue_max, 2),
        currency="USD",
        note="Prices are estimates based on market trends. Actual prices vary by region, quality, and buyer."
    )


def generate_recommendations(avg_length: float, quality: QualityIndicators) -> List[str]:
    """Generate personalized harvest recommendations"""
    recommendations = []
    
    if avg_length >= 25:
        recommendations.extend([
            "Harvest outer leaves first, leaving inner leaves to continue growing",
            "Cut leaves at the base using a clean, sharp knife at a 45-degree angle",
            "Best harvest time is early morning after watering the day before",
            "Process leaves within 2-3 hours of harvest for maximum gel freshness",
            "Store harvested gel in refrigerator for up to 7 days"
        ])
    elif avg_length >= 20:
        recommendations.extend([
            "Continue regular watering (once per week in growing season)",
            "Ensure 6-8 hours of bright, indirect sunlight daily",
            "Avoid overwatering - let soil dry between waterings",
            "Consider light fertilization (10-10-10 NPK) once monthly",
            "Recheck measurements in 2-3 weeks"
        ])
    elif avg_length >= 15:
        recommendations.extend([
            "Provide consistent care with regular watering schedule",
            "Ensure adequate sunlight (6-8 hours bright, indirect light)",
            "Use well-draining soil mix (cactus/succulent soil)",
            "Avoid disturbing the plant to promote steady growth",
            "Recheck measurements in 4-6 weeks"
        ])
    else:
        recommendations.extend([
            "Be patient - young aloe vera needs time to mature",
            "Ensure optimal growing conditions (light, water, soil)",
            "Avoid over-fertilization which can damage young plants",
            "Protect from extreme temperatures (ideal: 55-80°F)",
            "Recheck measurements in 2-3 months"
        ])
    
    # Add quality-specific recommendations
    if quality.harvest_readiness_score < 70:
        recommendations.append("Focus on consistent care to improve leaf quality and size")
    
    return recommendations


# ==================== API Endpoints ====================

@router.post("/harvest/assess", response_model=HarvestAssessmentResponse)
async def assess_harvest(request: HarvestAssessmentRequest):
    """
    Assess harvest readiness based on leaf measurements.
    
    This endpoint calculates harvest status, quality indicators, market insights,
    and recommendations based on measured leaf sizes.
    
    **No ML required** - Uses rule-based assessment logic.
    """
    try:
        # Extract measurements
        lengths = [m.length_cm for m in request.measurements]
        
        # Calculate statistics
        leaf_count = len(lengths)
        avg_length = sum(lengths) / leaf_count
        max_length = max(lengths)
        min_length = min(lengths)
        
        # Calculate standard deviation
        variance = sum((x - avg_length) ** 2 for x in lengths) / leaf_count
        std_deviation = variance ** 0.5
        
        # Generate assessment components
        harvest_status = calculate_harvest_status(avg_length)
        quality_indicators = calculate_quality_indicators(avg_length, std_deviation)
        market_insights = calculate_market_insights(avg_length, leaf_count)
        recommendations = generate_recommendations(avg_length, quality_indicators)
        
        return HarvestAssessmentResponse(
            timestamp=datetime.utcnow().isoformat(),
            leaf_count=leaf_count,
            avg_length_cm=round(avg_length, 2),
            max_length_cm=round(max_length, 2),
            min_length_cm=round(min_length, 2),
            std_deviation=round(std_deviation, 2),
            harvest_status=harvest_status,
            quality_indicators=quality_indicators,
            market_insights=market_insights,
            recommendations=recommendations
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to assess harvest: {str(e)}"
        )


@router.get("/harvest/info")
async def get_harvest_info():
    """
    Get information about the harvest assessment system.
    
    Returns details about measurement standards, size guidelines, and system capabilities.
    """
    return {
        "version": "1.0.0",
        "component": "Harvest Assessment (Component 4)",
        "method": "Card-based leaf measurement (No ML)",
        "reference_card": {
            "standard": "Business Card / Credit Card",
            "width_mm": 85.6,
            "height_mm": 54.0,
            "notes": "ISO/IEC 7810 ID-1 standard"
        },
        "size_guidelines": {
            "optimal_harvest": "25-30+ cm",
            "nearly_ready": "20-24 cm",
            "too_young": "< 20 cm",
            "minimum_recommended": "20 cm"
        },
        "measurement_limits": {
            "min_leaves": 1,
            "max_leaves": 10,
            "recommended_leaves": 3
        },
        "features": [
            "Real-time harvest readiness assessment",
            "Quality indicators (gel content, maturity)",
            "Market price estimates",
            "Personalized recommendations",
            "No ML processing required"
        ]
    }


@router.get("/harvest/health")
async def harvest_health_check():
    """Health check endpoint for harvest service"""
    return {
        "status": "healthy",
        "service": "Harvest Assessment",
        "component": "Component 4",
        "method": "Card-based measurement",
        "ml_required": False
    }


# ==================== Card Detection Models ====================

class CardCorner(BaseModel):
    """Single corner coordinate"""
    x: float
    y: float


class CardDetectionRequest(BaseModel):
    """Request body for card detection"""
    crop_corners: List[CardCorner] = Field(..., min_items=4, max_items=4, description="Crop area corners")


class CardDetectionResponse(BaseModel):
    """Response for card detection"""
    success: bool
    card_corners: Optional[List[CardCorner]] = None
    confidence: Optional[float] = None
    message: str


class LeafPoint(BaseModel):
    """Single point on a leaf (base or tip)"""
    x: float
    y: float
    type: str  # 'base' or 'tip'


class LeafMeasurementInput(BaseModel):
    """Input for a single leaf measurement"""
    base: LeafPoint
    tip: LeafPoint


class MeasureLengthRequest(BaseModel):
    """Request for measuring leaf lengths"""
    crop_corners: List[CardCorner] = Field(..., min_items=4, max_items=4)
    card_corners: List[CardCorner] = Field(..., min_items=4, max_items=4)
    leaf_points: List[LeafMeasurementInput] = Field(..., min_items=1, max_items=3)


class MeasuredLeaf(BaseModel):
    """A measured leaf with calculated length"""
    base: LeafPoint
    tip: LeafPoint
    length_cm: float
    length_pixels: float


class MeasureLengthResponse(BaseModel):
    """Response for leaf length measurements"""
    success: bool
    measured_leaves: List[MeasuredLeaf]
    message: str


@router.post("/harvest/detect_card")
async def detect_card(
    image: UploadFile = File(..., description="Image file containing reference card"),
    crop_quad: Optional[str] = Form(None, description="JSON string of crop quad corners [4 points] - optional")
):
    """
    Detect reference card corners in the image using OpenCV contour detection.
    
    Process:
    1. Apply perspective crop if crop_quad provided
    2. Detect credit card using contours + rectangle fit + aspect ratio ~1.586
    3. Return detected corners or failure message
    
    Args:
        image: Uploaded image file (JPEG/PNG)
        crop_quad: Optional JSON string containing 4 corner points for perspective crop
        
    Returns:
        CardDetectionResponse with detected corners or failure message
    """
    try:
        # Validate file type
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
            )
        
        # Read image
        contents = await image.read()
        if len(contents) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE / 1024 / 1024}MB"
            )
        
        # Convert to OpenCV format
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Failed to decode image")
        
        # Apply perspective crop if provided using robust quad warp
        if crop_quad:
            crop_data = json.loads(crop_quad)
            if len(crop_data) != 4:
                raise ValueError("crop_quad must contain exactly 4 points")
            
            # Extract points and apply quad warp
            quad_points = np.array([[p['x'], p['y']] for p in crop_data], dtype=np.float32)
            img = apply_quad_warp(img, quad_points)
        
        # Detect credit card
        detected_corners = detect_credit_card(img)
        
        if detected_corners is not None:
            corners_list = [
                CardCorner(x=float(pt[0]), y=float(pt[1]))
                for pt in detected_corners
            ]
            return CardDetectionResponse(
                success=True,
                card_corners=corners_list,
                confidence=0.85,
                message="Card successfully detected"
            )
        else:
            return CardDetectionResponse(
                success=False,
                card_corners=None,
                confidence=0.0,
                message="Unable to detect card automatically. Please mark corners manually."
            )
            
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid crop_quad JSON format")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Card detection failed: {str(e)}")


@router.post("/harvest/measure_length")
async def measure_leaf_length(
    image: UploadFile = File(..., description="Image file containing aloe leaves"),
    crop_quad: Optional[str] = Form(None, description="JSON string of crop quad corners [4 points] - optional"),
    card_corners: str = Form(..., description="JSON string of card corners [4 points]"),
    leaf_measurements: str = Form(..., description="JSON string of leaf measurements [{base: {x,y}, tip: {x,y}}, ...]"),
    reference_type: str = Form("CREDIT_CARD", description="Reference card type")
):
    """
    Calculate leaf lengths from user-marked points using card calibration.
    
    Process:
    1. Apply perspective crop if crop_quad provided
    2. Compute pixels-per-mm using card corners and known dimensions (85.60mm x 53.98mm)
    3. Calculate pixel distance base->tip for each leaf
    4. Convert to cm and apply maturity rules
    
    Args:
        image: Uploaded image file (JPEG/PNG)
        crop_quad: Optional JSON string of crop quad corners for perspective transform
        card_corners: JSON string of 4 card corner points for calibration (required)
        leaf_measurements: JSON string of leaf measurements [{base: {x, y}, tip: {x, y}}, ...]
        reference_type: Reference card type (default: CREDIT_CARD)
        
    Returns:
        Enhanced response with leaf lengths, avg, stage, confidence, and retake message if needed
    """
    try:
        # Validate file type
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
            )
        
        # Read image
        contents = await image.read()
        if len(contents) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE / 1024 / 1024}MB"
            )
        
        # Parse inputs
        card_data = json.loads(card_corners)
        leaf_data = json.loads(leaf_measurements)
        
        # Validate inputs
        if len(card_data) != 4:
            raise ValueError("card_corners must contain exactly 4 points")
        if len(leaf_data) < 1 or len(leaf_data) > 3:
            raise ValueError("Must provide 1-3 leaf measurements")
        
        # Validate leaf data structure - support both old (base/tip) and new (points array) formats
        for i, leaf in enumerate(leaf_data):
            # New format: {points: [{x, y}, {x, y}, ...]} - curve tracing with 3-4 points
            if 'points' in leaf:
                if not isinstance(leaf['points'], list) or len(leaf['points']) < 3:
                    raise ValueError(f"Leaf {i+1} must have at least 3 points for curve tracing")
                for j, point in enumerate(leaf['points']):
                    if 'x' not in point or 'y' not in point:
                        raise ValueError(f"Leaf {i+1} point {j+1} must have x and y coordinates")
            # Old format: {base: {x, y}, tip: {x, y}} - backward compatibility
            elif 'base' in leaf and 'tip' in leaf:
                for point_type in ['base', 'tip']:
                    point = leaf[point_type]
                    if 'x' not in point or 'y' not in point:
                        raise ValueError(f"Leaf {i+1} {point_type} must have x and y coordinates")
            else:
                raise ValueError(f"Leaf {i+1} must have either 'points' array or 'base'/'tip' format")
        
        # Card standard dimensions (ISO/IEC 7810 ID-1)
        CARD_WIDTH_MM = 85.60
        CARD_HEIGHT_MM = 53.98
        
        # Convert to OpenCV format for optional perspective correction
        if crop_quad:
            crop_data = json.loads(crop_quad)
            if len(crop_data) != 4:
                raise ValueError("crop_quad must contain exactly 4 points")
            
            # Need image for perspective transform
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise HTTPException(status_code=400, detail="Failed to decode image")
            
            # Apply robust quad warp to correct perspective
            quad_points = np.array([[p['x'], p['y']] for p in crop_data], dtype=np.float32)
            img = apply_quad_warp(img, quad_points)
            
            # Note: After perspective transform, coordinates need adjustment if user marked them
            # on original image. For now, assume coordinates are relative to cropped view.
        
        # Calculate card width in pixels (distance between corner 0 and 1)
        card_width_pixels = np.sqrt(
            (card_data[1]['x'] - card_data[0]['x']) ** 2 + 
            (card_data[1]['y'] - card_data[0]['y']) ** 2
        )
        
        # Calculate pixels per millimeter ratio
        pixels_per_mm = card_width_pixels / CARD_WIDTH_MM
        
        if pixels_per_mm <= 0:
            raise ValueError("Invalid card calibration: card width cannot be zero")
        
        # Measure each leaf
        leaf_lengths_cm = []
        for leaf in leaf_data:
            # New format: curve tracing with multiple points
            if 'points' in leaf:
                points = leaf['points']
                # Calculate curved distance through all points
                pixel_distance = 0.0
                for i in range(len(points) - 1):
                    p1 = points[i]
                    p2 = points[i + 1]
                    segment_distance = np.sqrt(
                        (p2['x'] - p1['x']) ** 2 + 
                        (p2['y'] - p1['y']) ** 2
                    )
                    pixel_distance += segment_distance
            # Old format: straight line base to tip (backward compatibility)
            else:
                base = leaf['base']
                tip = leaf['tip']
                # Calculate pixel distance between base and tip
                pixel_distance = np.sqrt(
                    (tip['x'] - base['x']) ** 2 + 
                    (tip['y'] - base['y']) ** 2
                )
            
            # Convert to centimeters
            length_mm = pixel_distance / pixels_per_mm
            length_cm = length_mm / 10.0
            
            leaf_lengths_cm.append(round(float(length_cm), 1))
        
        # Calculate average
        avg_leaf_length_cm = round(sum(leaf_lengths_cm) / len(leaf_lengths_cm), 1)
        
        # Determine maturity stage
        if avg_leaf_length_cm >= MATURITY_CONFIG["L2"]:
            stage = "MATURE"
        elif avg_leaf_length_cm >= MATURITY_CONFIG["L1"]:
            stage = "INTERMEDIATE"
        else:
            stage = "NOT_MATURE"
        
        # Calculate confidence based on measurement consistency
        confidence_status = "HIGH"
        retake_message = None
        
        if len(leaf_lengths_cm) == 1:
            confidence_status = "LOW"
            retake_message = "Only 1 leaf measured. Measure 3 leaves for better accuracy."
        elif len(leaf_lengths_cm) >= 2:
            # Calculate standard deviation
            mean = avg_leaf_length_cm
            variance = sum((x - mean) ** 2 for x in leaf_lengths_cm) / len(leaf_lengths_cm)
            std_dev = np.sqrt(variance)
            
            if std_dev >= 4:
                confidence_status = "LOW"
                retake_message = (
                    "High variation between measurements. Try:\\n"
                    "• Improve lighting conditions\\n"
                    "• Keep reference card completely flat\\n"
                    "• Ensure full card is visible in frame\\n"
                    "• Avoid camera tilt - keep parallel to plant"
                )
            elif std_dev >= 2:
                confidence_status = "MEDIUM"
            else:
                confidence_status = "HIGH"
        
        return {
            "leaf_lengths_cm": leaf_lengths_cm,
            "avg_leaf_length_cm": avg_leaf_length_cm,
            "stage": stage,
            "confidence_status": confidence_status,
            "retake_message": retake_message
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Measurement failed: {str(e)}")


@router.get("/harvest/rules")
async def get_harvest_rules():
    """
    Get maturity rule thresholds used for harvest assessment.
    
    Returns:
        L1: Threshold for NOT_MATURE vs INTERMEDIATE (cm)
        L2: Threshold for INTERMEDIATE vs MATURE (cm)
    """
    return {
        "L1": MATURITY_CONFIG["L1"],
        "L2": MATURITY_CONFIG["L2"],
        "rules": {
            "NOT_MATURE": f"< {MATURITY_CONFIG['L1']} cm",
            "INTERMEDIATE": f"{MATURITY_CONFIG['L1']} - {MATURITY_CONFIG['L2']} cm",
            "MATURE": f">= {MATURITY_CONFIG['L2']} cm"
        }
    }


# ==================== Helper Functions for OpenCV ====================

def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order 4 points consistently: [top-left, top-right, bottom-right, bottom-left].
    
    Algorithm:
    1. Find center point of quadrilateral
    2. Calculate angle from center to each point
    3. Sort by angle starting from top-left (angle ~225°)
    
    This is more robust than simple y-then-x sorting for irregular quadrilaterals.
    
    Args:
        pts: Array of 4 points [(x, y), ...] in any order
        
    Returns:
        Ordered array of points as np.float32
        
    Raises:
        ValueError: If pts doesn't contain exactly 4 points
    """
    if len(pts) != 4:
        raise ValueError(f"Expected 4 points, got {len(pts)}")
    
    pts = np.array(pts, dtype=np.float32)
    
    # Sum and difference method for ordering rectangle corners
    # This works even for rotated/skewed quadrilaterals
    
    # Sum: x + y
    # Top-left has smallest sum (top left corner)
    # Bottom-right has largest sum (bottom right corner)
    s = pts.sum(axis=1)
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    
    # Difference: y - x  
    # Top-right has smallest difference (small y, large x)
    # Bottom-left has largest difference (large y, small x)
    diff = np.diff(pts, axis=1)
    tr = pts[np.argmin(diff)]
    bl = pts[np.argmax(diff)]
    
    return np.array([tl, tr, br, bl], dtype=np.float32)


def apply_quad_warp(img: np.ndarray, quad_points: np.ndarray) -> np.ndarray:
    """
    Apply perspective transform to warp a quadrilateral region to a rectangle.
    
    This function:
    1. Orders the 4 corner points consistently
    2. Calculates the output rectangle dimensions
    3. Applies perspective transform using OpenCV
    
    Args:
        img: Input image (OpenCV BGR format)
        quad_points: 4 corner points [(x,y), ...] in any order
        
    Returns:
        Warped image as rectangular output
        
    Raises:
        ValueError: If quad_points doesn't contain exactly 4 points
    """
    # Order points consistently
    ordered = order_points(quad_points)
    
    # Extract ordered corners
    tl, tr, br, bl = ordered
    
    # Calculate width of output rectangle
    # Use maximum of top and bottom edge lengths
    width_top = np.linalg.norm(tr - tl)
    width_bottom = np.linalg.norm(br - bl)
    max_width = int(max(width_top, width_bottom))
    
    # Calculate height of output rectangle
    # Use maximum of left and right edge lengths
    height_left = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)
    max_height = int(max(height_left, height_right))
    
    # Define destination points for rectangle
    dst_points = np.array([
        [0, 0],                          # top-left
        [max_width - 1, 0],              # top-right
        [max_width - 1, max_height - 1], # bottom-right
        [0, max_height - 1]              # bottom-left
    ], dtype=np.float32)
    
    # Calculate perspective transform matrix
    transform_matrix = cv2.getPerspectiveTransform(ordered, dst_points)
    
    # Apply perspective warp
    warped = cv2.warpPerspective(img, transform_matrix, (max_width, max_height))
    
    return warped


def detect_credit_card(img: np.ndarray) -> Optional[np.ndarray]:
    """
    Detect credit card in image using contour detection and aspect ratio filtering.
    
    Args:
        img: OpenCV image (BGR format)
        
    Returns:
        numpy array of 4 corner points [(x,y), ...] or None if not found
    """
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Edge detection
    edges = cv2.Canny(blurred, 50, 150)
    
    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Credit card aspect ratio (width/height)
    TARGET_ASPECT_RATIO = 85.60 / 53.98  # ~1.586
    ASPECT_RATIO_TOLERANCE = 0.3
    
    # Sort contours by area (largest first)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    # Try to find rectangle with card-like aspect ratio
    for contour in contours[:10]:  # Check top 10 largest contours
        # Approximate contour to polygon
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        
        # Check if it's a quadrilateral
        if len(approx) == 4:
            # Get bounding rectangle to check aspect ratio
            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = w / h if h > 0 else 0
            
            # Check if aspect ratio matches credit card
            if abs(aspect_ratio - TARGET_ASPECT_RATIO) < ASPECT_RATIO_TOLERANCE:
                # Reorder points to [top-left, top-right, bottom-right, bottom-left]
                pts = approx.reshape(4, 2)
                rect = order_points(pts)
                return rect
    
    return None


# ==================== ML-Based Assessment (Optional Demo Feature) ====================

@router.post("/harvest/assess_ml")
async def assess_maturity_ml(
    file: UploadFile = File(..., description="Aloe Vera leaf image")
):
    """
    ML-based maturity assessment (Demo feature)
    
    Uses EfficientNetB0 model for image classification.
    Note: This is experimental with 38% test accuracy.
    """
    # Check if ML service is available
    if not harvest_ml_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="ML model not available. Please use measurement-based assessment."
        )
    
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Allowed: {ALLOWED_IMAGE_TYPES}"
        )
    
    try:
        # Read image
        image_bytes = await file.read()
        
        # Check file size
        if len(image_bytes) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Image too large. Maximum size: {MAX_UPLOAD_SIZE / 1024 / 1024}MB"
            )
        
        # Get ML prediction
        result = harvest_ml_service.predict(image_bytes)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "ML prediction failed")
            )
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "method": "ml",
            "prediction": result["prediction"],
            "confidence": result["confidence"],
            "status": result["status"],
            "color": result["color"],
            "message": result["message"],
            "top_predictions": result["all_predictions"],
            "warning": "This is a demo feature with limited accuracy (38% on test set). Use measurement-based method for production."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/harvest/ml_status")
async def get_ml_status():
    """Check if ML-based assessment is available"""
    return {
        "available": harvest_ml_service.is_available(),
        "model": "EfficientNetB0" if harvest_ml_service.is_available() else None,
        "note": "Demo feature - 38% test accuracy"
    }

    return None
