#!/usr/bin/env python3
"""
Test script for /predict endpoint

Sends sample images from the dataset to the prediction endpoint
and displays the JSON results.

Usage:
    python scripts/test_predict.py [image1] [image2] [image3]
    
If no images provided, uses default healthy plant images from dataset.
"""

import requests
import json
import sys
from pathlib import Path
from typing import List

# Configuration
API_URL = "http://localhost:8000"
PREDICT_ENDPOINT = f"{API_URL}/api/v1/predict"
HEALTH_ENDPOINT = f"{API_URL}/health"
MODEL_INFO_ENDPOINT = f"{API_URL}/api/v1/model_info"

# Default test images
DATASET_ROOT = Path(__file__).parent.parent.parent.parent / "dataset" / "Aloe Vera Leaf Disease Detection Dataset"
DEFAULT_IMAGES = [
    DATASET_ROOT / "Healthy" / "processed_img_Healthy111.jpeg",
    DATASET_ROOT / "Healthy" / "processed_img_Healthy112.jpeg",
    DATASET_ROOT / "Healthy" / "processed_img_Healthy113.jpeg",
]


def test_health_check():
    """Test the /health endpoint."""
    print("=" * 60)
    print("Testing /health endpoint...")
    print("=" * 60)
    
    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Health: {data.get('status')}")
        print(f"✓ Version: {data.get('version')}")
        print(f"✓ Message: {data.get('message')}")
        return True
        
    except requests.exceptions.ConnectionError:
        print("✗ ERROR: Cannot connect to server")
        print(f"  Make sure server is running at {API_URL}")
        return False
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False


def test_model_info():
    """Test the /model_info endpoint."""
    print("\n" + "=" * 60)
    print("Testing /model_info endpoint...")
    print("=" * 60)
    
    try:
        response = requests.get(MODEL_INFO_ENDPOINT, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        model = data.get('model', {})
        
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Model Type: {model.get('model_type')}")
        print(f"✓ Model Name: {model.get('model_name')}")
        print(f"✓ Architecture: {model.get('model_architecture')}")
        print(f"✓ Num Classes: {model.get('num_classes')}")
        print(f"✓ Device: {model.get('device')}")
        
        calibration = model.get('calibration', {})
        if calibration:
            print(f"✓ Temperature: {calibration.get('temperature')}")
            thresholds = calibration.get('thresholds', {})
            print(f"✓ Thresholds: HIGH={thresholds.get('HIGH')}, MEDIUM={thresholds.get('MEDIUM')}")
        
        return True
        
    except Exception as e:
        print(f"⚠ Model info unavailable: {e}")
        return False


def test_predict(image_paths: List[Path]):
    """Test the /predict endpoint with images."""
    print("\n" + "=" * 60)
    print("Testing /predict endpoint...")
    print("=" * 60)
    
    # Validate image files
    valid_images = []
    for img_path in image_paths:
        if not img_path.exists():
            print(f"⚠ Warning: Image not found: {img_path}")
            continue
        valid_images.append(img_path)
    
    if not valid_images:
        print("✗ ERROR: No valid images to test")
        return False
    
    print(f"\nSending {len(valid_images)} image(s):")
    for img in valid_images:
        print(f"  - {img.name}")
    
    # Prepare multipart form data
    files = []
    for i, img_path in enumerate(valid_images, 1):
        files.append((f'image{i}', (img_path.name, open(img_path, 'rb'), 'image/jpeg')))
    
    try:
        print(f"\nPOST {PREDICT_ENDPOINT}")
        response = requests.post(PREDICT_ENDPOINT, files=files, timeout=30)
        
        # Close file handles
        for _, (_, file_obj, _) in files:
            file_obj.close()
        
        response.raise_for_status()
        
        data = response.json()
        
        print(f"\n✓ Status: {response.status_code}")
        print("\n" + "-" * 60)
        print("RESPONSE JSON:")
        print("-" * 60)
        print(json.dumps(data, indent=2))
        print("-" * 60)
        
        # Print summary
        print("\nSUMMARY:")
        print(f"  Request ID: {data.get('request_id')}")
        print(f"  Confidence Status: {data.get('confidence_status')}")
        print(f"  Recommended Action: {data.get('recommended_next_step')}")
        
        if data.get('retake_message'):
            print(f"\n  ⚠ Retake Message: {data.get('retake_message')}")
        
        print(f"\n  Top Prediction:")
        top_pred = data.get('predictions', [{}])[0]
        print(f"    - Disease: {top_pred.get('disease_name')}")
        print(f"    - Confidence: {top_pred.get('prob', 0):.2%}")
        
        if len(data.get('predictions', [])) > 1:
            print(f"\n  Other Predictions:")
            for pred in data.get('predictions', [])[1:]:
                print(f"    - {pred.get('disease_name')}: {pred.get('prob', 0):.2%}")
        
        return True
        
    except requests.exceptions.Timeout:
        print("✗ ERROR: Request timed out (took > 30s)")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"✗ HTTP ERROR: {e}")
        if hasattr(e.response, 'text'):
            print(f"  Response: {e.response.text}")
        return False
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("AloeVeraMate API Test Runner")
    print("=" * 60)
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        # Use provided image paths
        image_paths = [Path(arg) for arg in sys.argv[1:]]
    else:
        # Use default images
        print("\nNo images provided, using default healthy plant images")
        image_paths = DEFAULT_IMAGES
    
    # Run tests
    success_count = 0
    total_tests = 3
    
    if test_health_check():
        success_count += 1
    
    if test_model_info():
        success_count += 1
    
    if test_predict(image_paths):
        success_count += 1
    
    # Print final summary
    print("\n" + "=" * 60)
    print(f"TESTS COMPLETED: {success_count}/{total_tests} passed")
    print("=" * 60)
    
    return 0 if success_count == total_tests else 1


if __name__ == "__main__":
    sys.exit(main())
