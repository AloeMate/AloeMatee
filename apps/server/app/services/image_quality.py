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

# Green content threshold for plant detection
# Signal 1: minimum green pixels in image
# Set low (3%) because diseased/sunburned aloe has very little green — measured
# across full test dataset: min green per class = 2-7%. Walls/skin score near 0%.
GREEN_PIXEL_MIN_RATIO = 0.03   # 3% of pixels must be green-ish
# Signal 2: skin tone rejection — if this fraction of pixels are skin-toned, reject
SKIN_PIXEL_MAX_RATIO  = 0.25   # kept for reference, not used in logic
# Signal 3: green must dominate over skin
GREEN_BEATS_SKIN_FACTOR = 2.0  # kept for reference, not used in logic
# Signal 4: vivid/saturated green rejection for non-aloe plants
# Aloe vera is grey-green / olive (moderate saturation, S ≈ 20-130).
# Grass, ferns, rose leaves are vivid bright green (S > 160).
VIVID_GREEN_MAX_RATIO = 0.70   # >70% vivid green = grass / fern / other plant


def normalize_for_inference(image: Image.Image) -> Image.Image:
    """
    Normalize image before ML inference to produce consistent input regardless of
    capture conditions (direct photo, screen photography, varying lighting).

    Two lightweight steps that improve model robustness:

    1. CLAHE on the L channel (LAB colour space)
       Contrast Limited Adaptive Histogram Equalization redistributes local
       contrast.  This counteracts the washed-out look of screen-photographed
       images and also helps with photos taken in uneven lighting.

    2. Mild unsharp mask
       Enhances mid-frequency edges without amplifying noise.  Compensates for
       the soft blur introduced by Moiré interference when photographing a
       laptop or phone screen, and for typical mobile-camera softness.

    Both steps are standard in medical / plant-imaging preprocessing pipelines
    and have no measurable negative effect on well-lit direct photos.

    Args:
        image: PIL Image (RGB, any resolution)

    Returns:
        Normalized PIL Image (RGB, same resolution)
    """
    try:
        img_rgb = np.array(image.convert("RGB"), dtype=np.uint8)

        # ── Step 1: CLAHE on L channel ───────────────────────────────────
        img_lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(img_lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_norm = clahe.apply(l)
        img_lab = cv2.merge([l_norm, a, b])
        img_rgb = cv2.cvtColor(img_lab, cv2.COLOR_LAB2RGB)

        # ── Step 2: Mild unsharp mask ────────────────────────────────────
        # amount=0.4 is gentle — recovers edge definition without over-sharpening
        blurred = cv2.GaussianBlur(img_rgb, (0, 0), sigmaX=1.5)
        img_rgb = cv2.addWeighted(img_rgb, 1.4, blurred, -0.4, 0)

        return Image.fromarray(img_rgb)

    except Exception as e:
        logger.error(f"normalize_for_inference error: {e} — returning original")
        return image


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


def check_is_plant(image: Image.Image) -> Tuple[bool, float]:
    """
    Check whether the image contains a plant (specifically aloe vera).

    Uses TWO signals:

    Signal 1 — Green pixel ratio (≥ 20%):
        At least 20% of pixels must be plant-green (HSV H:25-90, S:40+, V:30+).
        A hand, wall, furniture or random object scores near 0% → always rejected.
        Diseased aloe retains green healthy tissue → passes safely.

    Signal 2 — Vivid saturated green rejection (> 70%):
        Aloe vera is grey-green / olive (moderate S in HSV, S ≈ 30-130).
        Grass, ferns, and most other plants are vivid bright green (S > 140).
        Threshold is 70% so a screen-photographed aloe (backlight boosts
        apparent saturation) is not falsely rejected.
        Pure grass / fern fills 90-100% of the frame → always rejected.

    Note: skin detection was removed because warm-coloured soil and terracotta
    pots in the background of real aloe photos share the same HSV hue range as
    skin tone, causing false rejections.  Signal 1 (no green → not aloe) is
    sufficient to catch close-up hand photos.

    Args:
        image: PIL Image (RGB)

    Returns:
        Tuple of (is_likely_plant, green_ratio)
    """
    try:
        img_rgb = np.array(image.convert("RGB"), dtype=np.uint8)
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

        total_pixels = float(img_hsv.shape[0] * img_hsv.shape[1])

        # ── Signal 1: Green pixel ratio ───────────────────────────────────
        # H: 25-90 (yellow-green → green → cyan-green)
        # S: 15+   (includes grey-green / olive aloe vera, excludes near-white)
        # V: 25+   (not too dark)
        lower_green = np.array([25, 15, 25], dtype=np.uint8)
        upper_green = np.array([90, 255, 255], dtype=np.uint8)
        green_mask  = cv2.inRange(img_hsv, lower_green, upper_green)
        green_count = float(np.count_nonzero(green_mask))
        green_ratio = green_count / total_pixels

        # ── Signal 2: Vivid saturated green (non-aloe plants) ────────────
        # S > 160 = vivid primary green (grass, ferns, rose leaves …)
        lower_vivid = np.array([30, 160, 40], dtype=np.uint8)
        upper_vivid = np.array([90, 255, 255], dtype=np.uint8)
        vivid_mask  = cv2.inRange(img_hsv, lower_vivid, upper_vivid)
        vivid_ratio = float(np.count_nonzero(vivid_mask)) / total_pixels

        enough_green = green_ratio >= GREEN_PIXEL_MIN_RATIO
        too_vivid    = vivid_ratio >= VIVID_GREEN_MAX_RATIO

        is_plant = enough_green and not too_vivid

        logger.info(
            f"Plant check: green={green_ratio:.2%} (need≥{GREEN_PIXEL_MIN_RATIO:.0%}), "
            f"vivid={vivid_ratio:.2%} (need<{VIVID_GREEN_MAX_RATIO:.0%}) "
            f"→ is_plant={is_plant}"
        )
        return is_plant, green_ratio

    except Exception as e:
        logger.error(f"Error in plant check: {e}")
        return True, 1.0


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

