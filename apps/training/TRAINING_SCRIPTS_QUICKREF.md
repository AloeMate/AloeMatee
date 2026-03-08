# Training Scripts Quick Reference

## 🎯 Two-Stage Training (Complete Pipeline)

### Train Everything at Once

```powershell
# Windows
scripts\train_all.bat

# Linux/Mac
./scripts/train_all.sh
```

**What it does:**
1. Trains Stage A (binary: Healthy vs Unhealthy)
2. Trains Stage B (5 diseases)
3. Evaluates and calibrates both
4. Exports artifacts
5. Copies models to server

**Output:**
- `artifacts/stage_a/` → All Stage A artifacts
- `artifacts/stage_b/` → All Stage B artifacts
- `../server/data/models/stage_a/` → Server-ready Stage A model
- `../server/data/models/stage_b/` → Server-ready Stage B model

---

## 📦 Individual Stage Training

### Stage A Only (Binary Classifier)

```powershell
# Windows
scripts\train_stage_a.bat

# Linux/Mac
./scripts/train_stage_a.sh
```

**Pipeline:**
```
train_stage_a.py
    ↓
eval_stage_a.py
    ↓
calibrate_stage_a.py
    ↓
export_stage_a.py
```

**Classes:** Unhealthy (0), Healthy (1)

---

### Stage B Only (Disease Classifier)

```powershell
# Windows
scripts\train_stage_b.bat

# Linux/Mac
./scripts/train_stage_b.sh
```

**Pipeline:**
```
train_stage_b.py
    ↓
eval_stage_b.py
    ↓
calibrate_stage_b.py
    ↓
export_stage_b.py
```

**Classes:** Aloe Rot, Aloe Rust, Anthracnose, Leaf Spot, Sunburn

---

## 🔧 Manual Training Steps

### If you need more control:

#### Stage A:
```bash
python train_stage_a.py --epochs 20 --batch_size 32 --lr 0.001
python eval_stage_a.py
python calibrate_stage_a.py
python export_stage_a.py
```

#### Stage B:
```bash
python train_stage_b.py --epochs 20 --batch_size 32 --lr 0.001
python eval_stage_b.py
python calibrate_stage_b.py
python export_stage_b.py
```

---

## 📁 File Locations

### Python Scripts:
- `train_stage_a.py` - Stage A training logic
- `train_stage_b.py` - Stage B training logic
- `eval_stage_a.py` - Stage A evaluation
- `eval_stage_b.py` - Stage B evaluation
- `calibrate_stage_a.py` - Stage A calibration
- `calibrate_stage_b.py` - Stage B calibration
- `export_stage_a.py` - Stage A model export
- `export_stage_b.py` - Stage B model export

### Shell Scripts:
- `scripts/train_all.bat` / `.sh` - Complete pipeline (both stages)
- `scripts/train_stage_a.bat` / `.sh` - Stage A pipeline
- `scripts/train_stage_b.bat` / `.sh` - Stage B pipeline

---

## 📊 Artifacts Generated

### Stage A (`artifacts/stage_a/`):
- `model.pt` - Model checkpoint
- `model_metadata.json` - Model info
- `calibration.json` - Temperature scaling config
- `confusion_matrix.png` - 2x2 confusion matrix
- `eval_summary.txt` - Metrics (accuracy, precision, recall, F1)
- `training_history.json` - Loss/accuracy curves

### Stage B (`artifacts/stage_b/`):
- `model.pt` - Model checkpoint
- `model_metadata.json` - Model info
- `calibration.json` - Temperature scaling config
- `confusion_matrix.png` - 5x5 confusion matrix
- `eval_summary.txt` - Per-class metrics
- `training_history.json` - Loss/accuracy curves

---

## ⚙️ Customization

### Adjust Hyperparameters:

Edit the scripts or run manually:

```bash
# More epochs
python train_stage_a.py --epochs 30

# Smaller batch (for limited GPU memory)
python train_stage_a.py --batch_size 16

# Lower learning rate
python train_stage_a.py --lr 0.0005

# Combine options
python train_stage_a.py --epochs 30 --batch_size 64 --lr 0.0005
```

---

## 🚦 Typical Workflow

1. **First time setup:**
   ```bash
   pip install -r requirements.txt
   python split.py  # Create train/val/test splits
   ```

2. **Train both stages:**
   ```powershell
   scripts\train_all.bat  # Windows
   # or
   ./scripts/train_all.sh  # Linux/Mac
   ```

3. **Check results:**
   ```bash
   # View evaluation summaries
   cat artifacts/stage_a/eval_summary.txt
   cat artifacts/stage_b/eval_summary.txt
   
   # View confusion matrices (images)
   start artifacts/stage_a/confusion_matrix.png
   start artifacts/stage_b/confusion_matrix.png
   ```

4. **Test server:**
   ```bash
   cd ../server
   python scripts/test_predict.py
   ```

5. **Deploy:**
   ```bash
   cd ../mobile
   npm start
   ```

---

## 🎯 Quick Commands

```powershell
# Full pipeline (Windows)
cd apps\training
scripts\train_all.bat

# Stage A only (Windows)
scripts\train_stage_a.bat

# Stage B only (Windows)
scripts\train_stage_b.bat

# Full pipeline (Linux/Mac)
cd apps/training
./scripts/train_all.sh

# Stage A only (Linux/Mac)
./scripts/train_stage_a.sh

# Stage B only (Linux/Mac)
./scripts/train_stage_b.sh
```

---

## 📖 Documentation

- **TWO_STAGE_TRAINING.md** - Detailed training guide with troubleshooting
- **README.md** (root) - Project overview
- **apps/training/README.md** - Training-specific documentation

---

## 💡 Tips

- ✅ Always run `train_all` for production deployments
- ✅ Use individual stage scripts for debugging
- ✅ Check calibration metrics (lower ECE = better)
- ✅ Monitor confusion matrices for misclassification patterns
- ✅ Keep training artifacts for reproducibility
- ⚠️ Don't forget to restart the server after training new models

---

**Need help?** Check `TWO_STAGE_TRAINING.md` for detailed troubleshooting!
