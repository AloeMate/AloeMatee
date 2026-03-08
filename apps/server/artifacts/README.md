# Model Artifacts Directory

This directory contains the trained ML model files required for disease detection.

## Required Files

1. **model.pt** (77.81 MB) - Trained EfficientNetV2-S PyTorch model
2. **model_metadata.json** - Model configuration and class mappings
3. **calibration.json** - Confidence calibration parameters

## Setup Instructions

### Option 1: Download Pre-trained Model (Recommended)

The trained model is hosted separately due to its size (78 MB).

**Download from Google Drive / Dropbox / Hugging Face:**
```bash
# TODO: Add your model hosting URL here
# Example using wget:
wget -O apps/server/artifacts/model.pt https://YOUR_MODEL_URL/model.pt
```

### Option 2: Train Your Own Model

If you want to train from scratch:

```bash
cd apps/training
python train.py --epochs 50 --batch-size 32
```

After training, the model artifacts will be automatically copied to this directory.

## Fallback Behavior

If model files are missing:
- ✅ Server will start successfully
- ⚠️ Uses **placeholder inference** (hash-based predictions for testing)
- 📝 Logs warning: "Using placeholder inference service"

To use real ML predictions:
1. Download or train the model
2. Ensure PyTorch is installed: `pip install torch torchvision`
3. Restart the server

## File Descriptions

### model.pt
- **Size**: ~78 MB
- **Format**: PyTorch state dict
- **Architecture**: EfficientNetV2-S
- **Input**: 384x384 RGB images
- **Classes**: 6 aloe vera diseases

### model_metadata.json
- Class names and mappings
- Model architecture info
- Training configuration
- Version tracking

### calibration.json
- Confidence score calibration
- Per-class adjustments
- Improves prediction reliability

## Git Configuration

**Why isn't model.pt committed?**
- Model files are 78 MB (too large for git)
- Git is optimized for code, not large binary files
- Use Git LFS or external hosting for model distribution

**What IS committed:**
- ✅ model_metadata.json
- ✅ calibration.json
- ✅ This README with download instructions
