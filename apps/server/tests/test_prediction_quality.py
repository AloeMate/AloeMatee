"""
Integration test for quality checks in prediction endpoint.
"""

import pytest
import numpy as np
from PIL import Image
import tempfile
import os
from pathlib import Path

from app.services.disease_prediction import disease_predictor


def create_and_save_test_image(brightness: int = 128, blur_level: str = "sharp") -> str:
    """Create and save a test image, return path."""
    # Create image
    if blur_level == "sharp":
        img_array = np.full((400, 400, 3), 128, dtype=np.uint8)
        # Add checkerboard for high variance
        for i in range(0, 400, 20):
            for j in range(0, 400, 20):
                if (i // 20 + j // 20) % 2 == 0:
                    img_array[i:i+20, j:j+20, :] = min(255, brightness + 30)
                else:
                    img_array[i:i+20, j:j+20, :] = max(0, brightness - 30)
    else:  # blurry
        img_array = np.full((400, 400, 3), brightness, dtype=np.uint8)
        # Smooth gradient (low variance)
        for i in range(400):
            img_array[i, :, :] = int(brightness + 10 * np.sin(i / 50))
    
    image = Image.fromarray(img_array)
    
    # Save to temp file
    fd, path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)
    image.save(path)
    return path


@pytest.fixture
def cleanup_temp_files():
    """Track temp files for cleanup."""
    files = []
    yield files
    # Cleanup
    for f in files:
        try:
            if os.path.exists(f):
                os.remove(f)
        except Exception:
            pass


class TestPredictionWithQualityChecks:
    """Integration tests for quality checks in prediction flow."""
    
    @pytest.mark.asyncio
    async def test_blurry_image_rejected(self, cleanup_temp_files):
        """Blurry image should be rejected before inference."""
        # Create blurry image
        image_path = create_and_save_test_image(brightness=128, blur_level="blurry")
        cleanup_temp_files.append(image_path)
        
        # Predict
        response = await disease_predictor.predict_multiple([image_path])
        
        # Should return LOW confidence with retake message
        assert response.confidence_status == "LOW"
        assert response.recommended_next_step == "RETAKE"
        assert response.retake_message is not None
        assert len(response.retake_message) > 0
        assert any(word in response.retake_message.lower() 
                  for word in ["blur", "focus", "steady"])
    
    @pytest.mark.asyncio
    async def test_dark_image_rejected(self, cleanup_temp_files):
        """Very dark image should be rejected before inference."""
        # Create very dark but sharp image
        image_path = create_and_save_test_image(brightness=20, blur_level="sharp")
        cleanup_temp_files.append(image_path)
        
        # Predict
        response = await disease_predictor.predict_multiple([image_path])
        
        # Should return LOW confidence with retake message
        assert response.confidence_status == "LOW"
        assert response.recommended_next_step == "RETAKE"
        assert response.retake_message is not None
        assert len(response.retake_message) > 0
    
    @pytest.mark.asyncio
    async def test_bright_image_rejected(self, cleanup_temp_files):
        """Very bright image should be rejected before inference."""
        # Create very bright but sharp image
        image_path = create_and_save_test_image(brightness=240, blur_level="sharp")
        cleanup_temp_files.append(image_path)
        
        # Predict
        response = await disease_predictor.predict_multiple([image_path])
        
        # Should return LOW confidence with retake message
        assert response.confidence_status == "LOW"
        assert response.recommended_next_step == "RETAKE"
        assert response.retake_message is not None
        assert len(response.retake_message) > 0
    
    @pytest.mark.asyncio
    async def test_good_quality_proceeds_to_inference(self, cleanup_temp_files):
        """Good quality image should pass quality checks and reach inference."""
        # Create good quality image
        image_path = create_and_save_test_image(brightness=128, blur_level="sharp")
        cleanup_temp_files.append(image_path)
        
        # Predict
        response = await disease_predictor.predict_multiple([image_path])
        
        # Should have predictions (even if placeholder)
        assert len(response.predictions) > 0
        assert response.predictions[0].disease_id is not None
        assert response.predictions[0].disease_name is not None
        # Confidence status depends on model, but should not be None
        assert response.confidence_status in ["HIGH", "MEDIUM", "LOW"]
    
    @pytest.mark.asyncio
    async def test_multiple_images_one_bad_rejects_all(self, cleanup_temp_files):
        """If any image fails quality check, reject entire request."""
        # Create one good and one bad image
        good_image = create_and_save_test_image(brightness=128, blur_level="sharp")
        bad_image = create_and_save_test_image(brightness=128, blur_level="blurry")
        cleanup_temp_files.extend([good_image, bad_image])
        
        # Predict with both
        response = await disease_predictor.predict_multiple([good_image, bad_image])
        
        # Should be rejected due to the bad image
        assert response.confidence_status == "LOW"
        assert response.recommended_next_step == "RETAKE"
        assert response.retake_message is not None
