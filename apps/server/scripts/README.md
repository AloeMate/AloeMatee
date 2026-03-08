# Server Test Scripts

Automated testing scripts for the AloeVeraMate backend API.

## test_predict.py

Comprehensive API test runner that validates:
- `/health` endpoint
- `/model_info` endpoint  
- `/predict` endpoint with sample images

### Usage

**Test with default healthy plant images:**
```bash
python scripts/test_predict.py
```

**Test with specific images:**
```bash
python scripts/test_predict.py path/to/image1.jpg path/to/image2.jpg path/to/image3.jpg
```

**Example output:**
```
============================================================
AloeVeraMate API Test Runner
============================================================

============================================================
Testing /health endpoint...
============================================================
✓ Status: 200
✓ Health: healthy
✓ Version: 1.0.0
✓ Message: AloeVeraMate Disease Detection API is running

============================================================
Testing /model_info endpoint...
============================================================
✓ Status: 200
✓ Model Type: pytorch
✓ Model Name: efficientnetv2-s
✓ Architecture: EfficientNetV2-S
✓ Num Classes: 6
✓ Device: cuda
✓ Temperature: 1.234
✓ Thresholds: HIGH=0.8, MEDIUM=0.6

============================================================
Testing /predict endpoint...
============================================================

Sending 3 image(s):
  - processed_img_Healthy111.jpeg
  - processed_img_Healthy112.jpeg
  - processed_img_Healthy113.jpeg

POST http://localhost:8000/api/v1/predict

✓ Status: 200

------------------------------------------------------------
RESPONSE JSON:
------------------------------------------------------------
{
  "request_id": "abc-123...",
  "predictions": [
    {
      "disease_id": "healthy",
      "disease_name": "Healthy",
      "prob": 0.92,
      ...
    },
    ...
  ],
  "confidence_status": "HIGH",
  "recommended_next_step": "SHOW_TREATMENT",
  ...
}
------------------------------------------------------------

SUMMARY:
  Request ID: abc-123...
  Confidence Status: HIGH
  Recommended Action: SHOW_TREATMENT

  Top Prediction:
    - Disease: Healthy
    - Confidence: 92.00%

  Other Predictions:
    - Aloe Rot: 3.50%
    - Leaf Spot: 2.30%

============================================================
TESTS COMPLETED: 3/3 passed
============================================================
```

### Exit Codes
- `0`: All tests passed
- `1`: One or more tests failed

### Requirements
- Server running at `http://localhost:8000`
- `requests` library installed (`pip install requests`)
- Test images accessible (default: dataset/Healthy/*.jpeg)

### Troubleshooting

**Error: Cannot connect to server**
- Ensure server is running: `uvicorn app.main:app --reload`
- Check port 8000 is not in use

**Error: Image not found**
- Verify dataset path is correct
- Use absolute paths for custom images
- Check file extensions (.jpg, .jpeg, .png)

**Model info unavailable**
- This is a warning, not an error
- Model may not be loaded (using placeholder)
- Copy model artifacts to `data/models/`

---

## Adding New Test Scripts

To add new test scripts to this directory:

1. Create script file: `scripts/test_something.py`
2. Add shebang: `#!/usr/bin/env python3`
3. Make executable: `chmod +x scripts/test_something.py` (Linux/Mac)
4. Document usage in this README
5. Update `TESTING_CHECKLIST.md` if needed

---

Last Updated: January 6, 2026
