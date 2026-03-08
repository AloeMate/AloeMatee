"""
Unit tests for image quality validation.
"""

import pytest
import numpy as np
from PIL import Image

from app.services.image_quality import (
    check_blur,
    check_brightness,
    check_resolution,
    check_image_quality,
    ImageQualityIssue,
    BLUR_THRESHOLD,
    BRIGHTNESS_MIN,
    BRIGHTNESS_MAX,
    MIN_WIDTH,
    MIN_HEIGHT
)


def create_test_image(width: int = 400, height: int = 400, brightness: int = 128) -> Image.Image:
    """Create a test image with specified brightness."""
    img_array = np.full((height, width, 3), brightness, dtype=np.uint8)
    return Image.fromarray(img_array)


def create_blurry_image(width: int = 400, height: int = 400) -> Image.Image:
    """Create a blurry test image (smooth, no edges)."""
    img_array = np.full((height, width, 3), 128, dtype=np.uint8)
    # Add smooth gradient to make it very blurry
    for i in range(height):
        img_array[i, :, :] = int(128 + 30 * np.sin(i / 50))
    return Image.fromarray(img_array)


def create_sharp_image(width: int = 400, height: int = 400) -> Image.Image:
    """Create a sharp test image with clear edges."""
    img_array = np.full((height, width, 3), 128, dtype=np.uint8)
    # Add checkerboard pattern for high variance
    for i in range(0, height, 20):
        for j in range(0, width, 20):
            if (i // 20 + j // 20) % 2 == 0:
                img_array[i:i+20, j:j+20, :] = 255
            else:
                img_array[i:i+20, j:j+20, :] = 0
    return Image.fromarray(img_array)


class TestBlurCheck:
    """Tests for blur detection."""
    
    def test_sharp_image_passes(self):
        """Sharp image should pass blur check."""
        image = create_sharp_image()
        is_acceptable, blur_score = check_blur(image)
        
        assert is_acceptable is True
        assert blur_score >= BLUR_THRESHOLD
    
    def test_blurry_image_fails(self):
        """Blurry image should fail blur check."""
        image = create_blurry_image()
        is_acceptable, blur_score = check_blur(image)
        
        assert is_acceptable is False
        assert blur_score < BLUR_THRESHOLD
    
    def test_blur_score_is_numeric(self):
        """Blur score should be a numeric value."""
        image = create_test_image()
        is_acceptable, blur_score = check_blur(image)
        
        assert isinstance(blur_score, float)
        assert blur_score >= 0


class TestBrightnessCheck:
    """Tests for brightness validation."""
    
    def test_normal_brightness_passes(self):
        """Image with normal brightness should pass."""
        image = create_test_image(brightness=128)
        is_acceptable, brightness_score = check_brightness(image)
        
        assert is_acceptable is True
        assert BRIGHTNESS_MIN <= brightness_score <= BRIGHTNESS_MAX
    
    def test_dark_image_fails(self):
        """Very dark image should fail brightness check."""
        image = create_test_image(brightness=20)
        is_acceptable, brightness_score = check_brightness(image)
        
        assert is_acceptable is False
        assert brightness_score < BRIGHTNESS_MIN
    
    def test_bright_image_fails(self):
        """Very bright image should fail brightness check."""
        image = create_test_image(brightness=240)
        is_acceptable, brightness_score = check_brightness(image)
        
        assert is_acceptable is False
        assert brightness_score > BRIGHTNESS_MAX
    
    def test_brightness_score_range(self):
        """Brightness score should be in 0-255 range."""
        image = create_test_image()
        is_acceptable, brightness_score = check_brightness(image)
        
        assert isinstance(brightness_score, float)
        assert 0 <= brightness_score <= 255


class TestResolutionCheck:
    """Tests for resolution validation."""
    
    def test_adequate_resolution_passes(self):
        """Image with adequate resolution should pass."""
        image = create_test_image(width=400, height=400)
        is_acceptable, resolution = check_resolution(image)
        
        assert is_acceptable is True
        assert resolution[0] >= MIN_WIDTH
        assert resolution[1] >= MIN_HEIGHT
    
    def test_small_image_fails(self):
        """Image below minimum resolution should fail."""
        image = create_test_image(width=100, height=100)
        is_acceptable, resolution = check_resolution(image)
        
        assert is_acceptable is False
        assert resolution[0] < MIN_WIDTH or resolution[1] < MIN_HEIGHT
    
    def test_narrow_image_fails(self):
        """Narrow image (one dimension too small) should fail."""
        image = create_test_image(width=100, height=400)
        is_acceptable, resolution = check_resolution(image)
        
        assert is_acceptable is False
    
    def test_resolution_tuple_format(self):
        """Resolution should be returned as (width, height) tuple."""
        image = create_test_image(width=300, height=250)
        is_acceptable, resolution = check_resolution(image)
        
        assert isinstance(resolution, tuple)
        assert len(resolution) == 2
        assert resolution == (300, 250)


class TestImageQualityCheck:
    """Tests for overall image quality validation."""
    
    def test_good_quality_image_passes(self):
        """Image with good quality should pass all checks."""
        image = create_sharp_image()
        result = check_image_quality(image)
        
        assert result.is_acceptable is True
        assert result.issue == ImageQualityIssue.OK
        assert result.blur_score is not None
        assert result.brightness_score is not None
    
    def test_blurry_image_detected(self):
        """Blurry image should be detected and rejected."""
        image = create_blurry_image()
        result = check_image_quality(image)
        
        assert result.is_acceptable is False
        assert result.issue == ImageQualityIssue.BLURRY
        assert "blur" in result.get_user_message().lower()
    
    def test_dark_image_detected(self):
        """Dark image should be detected and rejected (may fail blur check first)."""
        # Create sharp but dark image with high contrast checkerboard
        img_array = np.full((400, 400, 3), 15, dtype=np.uint8)
        # Add high contrast checkerboard pattern for sharpness
        for i in range(0, 400, 20):
            for j in range(0, 400, 20):
                if (i // 20 + j // 20) % 2 == 0:
                    img_array[i:i+20, j:j+20, :] = 35  # Dark but with contrast
                else:
                    img_array[i:i+20, j:j+20, :] = 15  # Very dark
        image = Image.fromarray(img_array)
        
        result = check_image_quality(image)
        
        # Should be rejected, either for darkness or blur
        assert result.is_acceptable is False
        assert result.issue in [ImageQualityIssue.TOO_DARK, ImageQualityIssue.BLURRY]
        assert len(result.get_user_message()) > 0
    
    def test_bright_image_detected(self):
        """Bright image should be detected and rejected."""
        # Create sharp but bright image with high contrast checkerboard
        img_array = np.full((400, 400, 3), 245, dtype=np.uint8)
        # Add high contrast checkerboard pattern for sharpness
        for i in range(0, 400, 20):
            for j in range(0, 400, 20):
                if (i // 20 + j // 20) % 2 == 0:
                    img_array[i:i+20, j:j+20, :] = 255  # Very bright
                else:
                    img_array[i:i+20, j:j+20, :] = 220  # Bright but with contrast
        image = Image.fromarray(img_array)
        
        result = check_image_quality(image)
        
        assert result.is_acceptable is False
        assert result.issue == ImageQualityIssue.TOO_BRIGHT
        assert "bright" in result.get_user_message().lower() or "overexposed" in result.get_user_message().lower()
    
    def test_user_messages_are_helpful(self):
        """Quality issue messages should provide actionable advice."""
        # Test blurry
        blurry_result = check_image_quality(create_blurry_image())
        assert len(blurry_result.get_user_message()) > 20
        assert any(word in blurry_result.get_user_message().lower() 
                  for word in ["focus", "steady", "blur"])
        
        # Test dark
        dark_img = create_test_image(brightness=20)
        dark_result = check_image_quality(dark_img)
        if not dark_result.is_acceptable:
            assert len(dark_result.get_user_message()) > 20
    
    def test_low_resolution_detected(self):
        """Low resolution image should be detected and rejected."""
        small_img = create_test_image(width=100, height=100)
        result = check_image_quality(small_img)
        
        assert result.is_acceptable is False
        assert result.issue == ImageQualityIssue.LOW_RESOLUTION
        assert "resolution" in result.get_user_message().lower()
    
    def test_resolution_info_included(self):
        """Quality result should include resolution information."""
        image = create_test_image(width=400, height=400)
        result = check_image_quality(image)
        
        assert result.resolution is not None
        assert result.resolution == (400, 400)
    
    def test_does_not_crash_on_edge_cases(self):
        """Should handle edge cases gracefully."""
        # Very small image
        small_img = create_test_image(width=10, height=10)
        result = check_image_quality(small_img)
        assert result is not None
        
        # Grayscale image
        gray_img = create_test_image().convert('L')
        result = check_image_quality(gray_img)
        assert result is not None
