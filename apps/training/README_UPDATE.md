# README Update - Two-Stage Training Section

## Add this section to apps/training/README.md

---

## 🚀 Two-Stage Training (Recommended)

### Quick Start

The easiest way to train both Stage A and Stage B models:

#### Windows (PowerShell/CMD)
```powershell
cd apps\training
scripts\train_all.bat
```

#### Linux/Mac
```bash
cd apps/training
# First time setup (make scripts executable)
chmod +x scripts/*.sh

# Run training
./scripts/train_all.sh
```

This automatically:
1. ✅ Trains Stage A (binary: Healthy vs Unhealthy)
2. ✅ Trains Stage B (5 diseases classifier)
3. ✅ Evaluates and calibrates both models
4. ✅ Exports production-ready artifacts
5. ✅ Copies models to `apps/server/data/models/`

**Training time:** ~25-30 minutes on GPU, ~5-6 hours on CPU

---

### Individual Stage Training

#### Train Only Stage A (Binary Classifier)

```powershell
# Windows
scripts\train_stage_a.bat

# Linux/Mac
./scripts/train_stage_a.sh
```

**What it trains:**
- 2 classes: Unhealthy (0), Healthy (1)
- Purpose: Separate healthy plants from diseased ones

#### Train Only Stage B (Disease Classifier)

```powershell
# Windows
scripts\train_stage_b.bat

# Linux/Mac
./scripts/train_stage_b.sh
```

**What it trains:**
- 5 classes: Aloe Rot, Aloe Rust, Anthracnose, Leaf Spot, Sunburn
- Purpose: Identify specific disease types

---

### Output Structure

After training, you'll find:

```
apps/training/artifacts/
├── stage_a/                        # Binary classifier artifacts
│   ├── model.pt                    # Model checkpoint (~90MB)
│   ├── model_metadata.json         # Model info
│   ├── calibration.json            # Temperature scaling config
│   ├── confusion_matrix.png        # 2x2 confusion matrix
│   ├── eval_summary.txt            # Accuracy, precision, recall, F1
│   └── training_history.json       # Loss/accuracy curves
│
└── stage_b/                        # Disease classifier artifacts
    ├── model.pt                    # Model checkpoint (~90MB)
    ├── model_metadata.json         # Model info
    ├── calibration.json            # Temperature scaling config
    ├── confusion_matrix.png        # 5x5 confusion matrix
    ├── eval_summary.txt            # Per-disease metrics
    └── training_history.json       # Loss/accuracy curves
```

**Server deployment** (automatic):
```
apps/server/data/models/
├── stage_a/                        # Ready for inference
│   ├── model.pt
│   ├── model_metadata.json
│   └── calibration.json
│
└── stage_b/                        # Ready for inference
    ├── model.pt
    ├── model_metadata.json
    └── calibration.json
```

---

### Customization

Edit hyperparameters by modifying the scripts or running Python directly:

```bash
# Train Stage A with custom settings
python train_stage_a.py --epochs 30 --batch_size 64 --lr 0.0005

# Train Stage B with custom settings
python train_stage_b.py --epochs 30 --batch_size 64 --lr 0.0005
```

**Available parameters:**
- `--epochs`: Number of training epochs (default: 20)
- `--batch_size`: Batch size (default: 32, reduce to 16 for limited GPU memory)
- `--lr`: Learning rate (default: 0.001)
- `--patience`: Early stopping patience (default: 5)

---

### Documentation

For detailed instructions, troubleshooting, and best practices:

- **TWO_STAGE_TRAINING.md** - Complete guide with troubleshooting
- **TRAINING_SCRIPTS_QUICKREF.md** - Quick command reference
- **IMPLEMENTATION_SUMMARY.md** - Implementation overview
- **FILE_VERIFICATION.md** - Verify all files are in place

---

### Troubleshooting

**Issue: Module not found**
```bash
pip install -r requirements.txt
```

**Issue: CUDA out of memory**
```bash
# Reduce batch size
python train_stage_a.py --batch_size 16
```

**Issue: Dataset not found**
```bash
# Create train/val/test splits first
python split.py
```

**Issue: Scripts won't run (Windows)**
- Use PowerShell or Command Prompt (not Git Bash)
- Run: `scripts\train_all.bat`

**Issue: Permission denied (Linux/Mac)**
```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh
# Or use the setup script:
cd scripts && bash setup.sh && cd ..
```

---

### Quick Commands Cheat Sheet

```powershell
# Windows - Full pipeline
cd apps\training
scripts\train_all.bat

# Windows - Stage A only
scripts\train_stage_a.bat

# Windows - Stage B only
scripts\train_stage_b.bat

# Linux/Mac - Full pipeline
cd apps/training
./scripts/train_all.sh

# Linux/Mac - Stage A only
./scripts/train_stage_a.sh

# Linux/Mac - Stage B only
./scripts/train_stage_b.sh
```

---

### Verification

Check that training completed successfully:

```powershell
# Windows
dir artifacts\stage_a\model.pt
dir artifacts\stage_b\model.pt
dir ..\server\data\models\stage_a\model.pt
dir ..\server\data\models\stage_b\model.pt

# Linux/Mac
ls -lh artifacts/stage_a/model.pt
ls -lh artifacts/stage_b/model.pt
ls -lh ../server/data/models/stage_a/model.pt
ls -lh ../server/data/models/stage_b/model.pt
```

All model files should be ~90MB each.

---

### Next Steps

1. ✅ Train models: `scripts\train_all.bat` (Windows) or `./scripts/train_all.sh` (Linux/Mac)
2. ✅ Review metrics: Check `eval_summary.txt` files
3. ✅ View confusion matrices: Open `.png` files
4. ✅ Test server: `cd ../server; python scripts/test_predict.py`
5. ✅ Deploy mobile: `cd ../mobile; npm start`

---

