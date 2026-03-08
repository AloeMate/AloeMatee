# Two-Stage Training - File Verification Checklist

## ✅ Shell Scripts (6 files)

### Windows Batch Files
- [x] `scripts/train_stage_a.bat` - Stage A pipeline (Windows)
- [x] `scripts/train_stage_b.bat` - Stage B pipeline (Windows)
- [x] `scripts/train_all.bat` - Complete pipeline (Windows)

### Unix/Linux/Mac Shell Scripts
- [x] `scripts/train_stage_a.sh` - Stage A pipeline (Unix)
- [x] `scripts/train_stage_b.sh` - Stage B pipeline (Unix)
- [x] `scripts/train_all.sh` - Complete pipeline (Unix)

## ✅ Python Training Scripts (8 files)

### Training
- [x] `train_stage_a.py` - Stage A training logic
- [x] `train_stage_b.py` - Stage B training logic

### Evaluation
- [x] `eval_stage_a.py` - Stage A evaluation (NEW)
- [x] `eval_stage_b.py` - Stage B evaluation (NEW)

### Calibration
- [x] `calibrate_stage_a.py` - Stage A temperature scaling (UPDATED)
- [x] `calibrate_stage_b.py` - Stage B temperature scaling (UPDATED)

### Export
- [x] `export_stage_a.py` - Stage A model export (NEW)
- [x] `export_stage_b.py` - Stage B model export (NEW)

## ✅ Documentation Files (3 files)

- [x] `TWO_STAGE_TRAINING.md` - Comprehensive training guide
- [x] `TRAINING_SCRIPTS_QUICKREF.md` - Quick command reference
- [x] `IMPLEMENTATION_SUMMARY.md` - Implementation overview

## Pipeline Verification

### Stage A Pipeline (train_stage_a.sh/.bat)
```
1. train_stage_a.py --epochs 20 --batch_size 32 --lr 0.001
   └─> Creates: artifacts/stage_a/checkpoints/
   
2. eval_stage_a.py
   └─> Creates: confusion_matrix.png, eval_summary.txt
   
3. calibrate_stage_a.py
   └─> Creates: calibration.json
   
4. export_stage_a.py
   └─> Creates: model.pt, model_metadata.json
```

### Stage B Pipeline (train_stage_b.sh/.bat)
```
1. train_stage_b.py --epochs 20 --batch_size 32 --lr 0.001
   └─> Creates: artifacts/stage_b/checkpoints/
   
2. eval_stage_b.py
   └─> Creates: confusion_matrix.png, eval_summary.txt
   
3. calibrate_stage_b.py
   └─> Creates: calibration.json
   
4. export_stage_b.py
   └─> Creates: model.pt, model_metadata.json
```

### Master Pipeline (train_all.sh/.bat)
```
1. Run train_stage_a.sh/.bat
2. Run train_stage_b.sh/.bat
3. Create server directories:
   - apps/server/data/models/stage_a/
   - apps/server/data/models/stage_b/
4. Copy artifacts to server:
   - model.pt
   - model_metadata.json
   - calibration.json
```

## Quick Test Commands

### Test File Existence (Windows)
```powershell
cd apps\training

# Check scripts
dir scripts\train_*.bat
dir scripts\train_*.sh

# Check Python files
dir train_stage_*.py
dir eval_stage_*.py
dir calibrate_stage_*.py
dir export_stage_*.py

# Check documentation
dir *.md
```

### Test File Existence (Linux/Mac)
```bash
cd apps/training

# Check scripts
ls -la scripts/train_*.sh
ls -la scripts/train_*.bat

# Check Python files
ls -la train_stage_*.py
ls -la eval_stage_*.py
ls -la calibrate_stage_*.py
ls -la export_stage_*.py

# Check documentation
ls -la *.md
```

### Test Script Permissions (Linux/Mac only)
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Verify permissions
ls -la scripts/
# Should show: -rwxr-xr-x (executable)
```

## Expected Artifacts After Training

### Stage A Artifacts (`artifacts/stage_a/`)
- `model.pt` - Model checkpoint (~90MB)
- `model_metadata.json` - Metadata (~1KB)
- `calibration.json` - Calibration config (~1KB)
- `confusion_matrix.png` - 2x2 matrix image (~50KB)
- `eval_summary.txt` - Text metrics (~2KB)
- `training_history.json` - Loss/accuracy curves (~10KB)
- `checkpoints/` - Training checkpoints (optional)

### Stage B Artifacts (`artifacts/stage_b/`)
- `model.pt` - Model checkpoint (~90MB)
- `model_metadata.json` - Metadata (~1KB)
- `calibration.json` - Calibration config (~1KB)
- `confusion_matrix.png` - 5x5 matrix image (~80KB)
- `eval_summary.txt` - Text metrics (~5KB)
- `training_history.json` - Loss/accuracy curves (~10KB)
- `checkpoints/` - Training checkpoints (optional)

### Server Artifacts (`apps/server/data/models/`)
```
stage_a/
├── model.pt
├── model_metadata.json
└── calibration.json

stage_b/
├── model.pt
├── model_metadata.json
└── calibration.json
```

## Ready to Train?

✅ All 17 files are in place:
- 6 shell scripts (.bat + .sh)
- 8 Python scripts
- 3 documentation files

**Run this command to start training:**

```powershell
# Windows
cd apps\training
scripts\train_all.bat

# Linux/Mac
cd apps/training
chmod +x scripts/*.sh  # First time only
./scripts/train_all.sh
```

## Troubleshooting

### Scripts won't run
- **Windows**: Use PowerShell or CMD, not Git Bash
- **Linux/Mac**: Make sure scripts are executable: `chmod +x scripts/*.sh`

### Module not found
```bash
cd apps/training
pip install -r requirements.txt
```

### CUDA out of memory
- Reduce batch size: Edit scripts to use `--batch_size 16`

### Can't find dataset
```bash
python split.py  # Create train/val/test splits first
```

## Summary

**Status: ALL FILES VERIFIED ✅**

The complete two-stage training infrastructure is ready to use!

- 17/17 files created
- Cross-platform support (Windows + Unix)
- Comprehensive documentation
- Error handling in place
- Server deployment automated

**Next step:** Run `scripts\train_all.bat` (Windows) or `./scripts/train_all.sh` (Linux/Mac)
