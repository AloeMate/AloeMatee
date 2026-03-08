"""
Image quality validation service.

Performs quality checks on images before inference:
- Blur detection using variance of Laplacian
- Brightness validation (too dark/too bright)
"""

import cv2
import numpy as np
from typing import Tuple, Optional
from enum import Enum
from PIL import Image
import logging

logger = logging.getLogger(__name__)


class ImageQualityIssue(Enum):
    """Types of image quality issues."""
    BLURRY = "blurry"
    TOO_DARK = "too_dark"
    TOO_BRIGHT = "too_bright"
    LOW_RESOLUTION = "low_resolution"
    OK = "ok"


class ImageQualityResult:
    """Result of image quality check."""
    
    def __init__(self, is_acceptable: bool, issue: ImageQualityIssue, 
                 blur_score: Optional[float] = None,
                 brightness_score: Optional[float] = None,
                 resolution: Optional[Tuple[int, int]] = None):
        self.is_acceptable = is_acceptable
        self.issue = issue
        self.blur_score = blur_score
        self.brightness_score = brightness_score
        self.resolution = resolution
    
    def get_user_message(self) -> str:
        """Get user-friendly message for the quality issue."""
        if self.issue == ImageQualityIssue.BLURRY:
            return "Image is too blurry. Please ensure the camera is focused and hold steady while taking the photo."
        elif self.issue == ImageQualityIssue.TOO_DARK:
            return "Image is too dark. Please take the photo in better lighting conditions or increase brightness."
        elif self.issue == ImageQualityIssue.TOO_BRIGHT:
            return "Image is overexposed. Please reduce lighting or move away from direct light sources."
        elif self.issue == ImageQualityIssue.LOW_RESOLUTION:
            return "Image resolution is too low. Please take a clearer photo from a closer distance or use a higher resolution camera."
        return ""


MIN_WIDTH = 224         # Minimum acceptable image width in pixels
MIN_HEIGHT = 224        # Minimum acceptable image height in pixels
# Quality thresholds - Very lenient for real-world mobile photos
BLUR_THRESHOLD = 20.0   # Variance of Laplacian below this indicates blur (very lenient for real photos)
BRIGHTNESS_MIN = 20.0   # Mean pixel intensity below this is too dark (0-255 scale) (very lenient)
BRIGHTNESS_MAX = 240.0  # Mean pixel intensity above this is too bright (0-255 scale) (very lenient)


def check_blur(image: Image.Image) -> Tuple[bool, float]:
    """
    Check if image is blurry using variance of Laplacian method.
    
    Args:
        image: PIL Image to check
        
    Returns:
        Tuple of (is_acceptable, blur_score)
        Higher blur_score means sharper image
    """
    try:
        # Convert PIL to numpy array
        img_array = np.array(image)
        
        # Convert to grayscale if needed
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Calculate variance of Laplacian
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        blur_score = float(laplacian.var())
        
        is_acceptable = blur_score >= BLUR_THRESHOLD
        
        logger.debug(f"Blur check: score={blur_score:.2f}, threshold={BLUR_THRESHOLD}, acceptable={is_acceptable}")
        
        return is_acceptable, blur_score
        
    except Exception as e:
        logger.error(f"Error checking blur: {e}")
        # On error, assume acceptable to not block inference
        return True, 0.0


def check_brightness(image: Image.Image) -> Tuple[bool, float]:
    """
    Check if image brightness is acceptable (not too dark or too bright).
    
    Args:
        image: PIL Image to check
        
    Returns:
        Tuple of (is_acceptable, brightness_score)
        brightness_score is mean pixel intensity (0-255)
    """
    try:
        # Convert PIL to numpy array
        img_array = np.array(image)
        
        # Convert to grayscale for brightness calculation
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Calculate mean pixel intensity
        brightness_score = float(gray.mean())
        
        is_acceptable = BRIGHTNESS_MIN <= brightness_score <= BRIGHTNESS_MAX
        
        logger.debug(f"Brightness check: score={brightness_score:.2f}, "
                    f"range=[{BRIGHTNESS_MIN}, {BRIGHTNESS_MAX}], acceptable={is_acceptable}")
        
        return is_acceptable, brightness_score
        
    except Exception as e:
        logger.error(f"Error checking brightness: {e}")
        # On error, assume acceptable to not block inference
        return True, 0.0


def check_resolution(image: Image.Image) -> Tuple[bool, Tuple[int, int]]:
    """
    Check if image resolution meets minimum requirements.
    
    Args:
        image: PIL Image to check
        
    Returns:
        Tuple of (is_acceptable, (width, height))
    """
    try:
        width, height = image.size
        
        is_acceptable = width >= MIN_WIDTH and height >= MIN_HEIGHT
        
        logger.debug(f"Resolution check: {width}x{height}, "
                    f"minimum={MIN_WIDTH}x{MIN_HEIGHT}, acceptable={is_acceptable}")
        
        return is_acceptable, (width, height)
        
    except Exception as e:
        logger.error(f"Error checking resolution: {e}")
        # On error, assume acceptable to not block inference
        return True, (0, 0)


def check_image_quality(image: Image.Image) -> ImageQualityResult:
    """
    Perform comprehensive quality checks on an image.
    
    Checks performed:
    - Resolution (minimum size)
    - Blur detection
    - Brightness validation
    
    Args:
        image: PIL Image to check
        
    Returns:
        ImageQualityResult with details of the check
    """
    try:
        # Check resolution first
        resolution_ok, resolution = check_resolution(image)
        if not resolution_ok:
            logger.info(f"Image failed resolution check: {resolution[0]}x{resolution[1]}")
            return ImageQualityResult(
                is_acceptable=False,
                issue=ImageQualityIssue.LOW_RESOLUTION,
                resolution=resolution
            )
        
        # Check blur
        blur_ok, blur_score = check_blur(image)
        if not blur_ok:
            logger.info(f"Image failed blur check: score={blur_score:.2f}")
            return ImageQualityResult(
                is_acceptable=False,
                issue=ImageQualityIssue.BLURRY,
                blur_score=blur_score,
                resolution=resolution
            )
        
        # Check brightness
        brightness_ok, brightness_score = check_brightness(image)
        if not brightness_ok:
            if brightness_score < BRIGHTNESS_MIN:
                issue = ImageQualityIssue.TOO_DARK
                logger.info(f"Image too dark: brightness={brightness_score:.2f}")
            else:
                issue = ImageQualityIssue.TOO_BRIGHT
                logger.info(f"Image too bright: brightness={brightness_score:.2f}")
            
            return ImageQualityResult(
                is_acceptable=False,
                issue=issue,
                blur_score=blur_score,
                brightness_score=brightness_score,
                resolution=resolution
            )
        
        # All checks passed
        logger.debug(f"Image quality OK: blur={blur_score:.2f}, brightness={brightness_score:.2f}, resolution={resolution[0]}x{resolution[1]}")
        return ImageQualityResult(
            is_acceptable=True,
            issue=ImageQualityIssue.OK,
            blur_score=blur_score,
            brightness_score=brightness_score,
            resolution=resolution
        )
        
    except Exception as e:
        logger.error(f"Error in image quality check: {e}")
        # On error, assume acceptable to not crash
        return ImageQualityResult(
            is_acceptable=True,
            issue=ImageQualityIssue.OK
        )

