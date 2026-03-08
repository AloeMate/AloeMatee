# Two-Stage Training Guide

This guide explains how to train both Stage A (binary) and Stage B (disease) models for the AloeVeraMate system.

## 🎯 Overview

The two-stage model architecture:
- **Stage A**: Binary classifier (Healthy vs Unhealthy)
- **Stage B**: Disease classifier (5 aloe vera diseases only)

## 🚀 Quick Start

### Windows

```powershell
cd apps\training
scripts\train_all.bat
```

### Linux/Mac

```bash
cd apps/training
./scripts/train_all.sh
```

This automatically:
1. Trains Stage A binary classifier
2. Evaluates and calibrates Stage A
3. Exports Stage A artifacts
4. Trains Stage B disease classifier
5. Evaluates and calibrates Stage B
6. Exports Stage B artifacts
7. Copies models to `apps\server\data\models\stage_a\` and `stage_b\`

## 📁 Output Structure

After running `train_all`, you'll have:

```
apps/training/artifacts/
├── stage_a/
│   ├── model.pt                    # Binary classifier model
│   ├── model_metadata.json         # Model info
│   ├── calibration.json            # Temperature scaling config
│   ├── confusion_matrix.png        # 2x2 confusion matrix
│   ├── eval_summary.txt            # Evaluation metrics
│   └── training_history.json       # Loss/accuracy curves
└── stage_b/
    ├── model.pt                    # Disease classifier model
    ├── model_metadata.json         # Model info
    ├── calibration.json            # Temperature scaling config
    ├── confusion_matrix.png        # 5x5 confusion matrix
    ├── eval_summary.txt            # Evaluation metrics
    └── training_history.json       # Loss/accuracy curves

apps/server/data/models/
├── stage_a/
│   ├── model.pt
│   ├── model_metadata.json
│   └── calibration.json
└── stage_b/
    ├── model.pt
    ├── model_metadata.json
    └── calibration.json
```

## ⚙️ Individual Stage Training

### Train Only Stage A

```powershell
# Windows
cd apps\training
scripts\train_stage_a.bat

# Linux/Mac
./scripts/train_stage_a.sh
```

This runs:
1. `python train_stage_a.py --epochs 20 --batch_size 32 --lr 0.001`
2. `python eval_stage_a.py`
3. `python calibrate_stage_a.py`
4. `python export_stage_a.py`

### Train Only Stage B

```powershell
# Windows
cd apps\training
scripts\train_stage_b.bat

# Linux/Mac
./scripts/train_stage_b.sh
```

This runs:
1. `python train_stage_b.py --epochs 20 --batch_size 32 --lr 0.001`
2. `python eval_stage_b.py`
3. `python calibrate_stage_b.py`
4. `python export_stage_b.py`

## 🔧 Customizing Training

### Adjust Hyperparameters

Edit the scripts to change training parameters:

**Stage A** (`scripts/train_stage_a.bat` or `.sh`):
```bash
python train_stage_a.py --epochs 30 --batch_size 64 --lr 0.0005
```

**Stage B** (`scripts/train_stage_b.bat` or `.sh`):
```bash
python train_stage_b.py --epochs 30 --batch_size 64 --lr 0.0005
```

### Common Parameters

- `--epochs`: Number of training epochs (default: 20)
- `--batch_size`: Batch size for training (default: 32)
- `--lr`: Learning rate (default: 0.001)
- `--patience`: Early stopping patience (default: 5)

## 📊 Interpreting Results

### Stage A Evaluation

Check `artifacts/stage_a/eval_summary.txt` for:
- **Accuracy**: Overall binary classification accuracy
- **Precision/Recall**: For both Healthy and Unhealthy classes
- **F1-Score**: Harmonic mean of precision and recall

### Stage B Evaluation

Check `artifacts/stage_b/eval_summary.txt` for:
- **Per-disease metrics**: Precision, recall, F1 for each of 5 diseases
- **Confusion matrix**: Shows misclassification patterns
- **Overall accuracy**: Across all disease classes

### Calibration Metrics

Check `calibration.json` for:
- **Temperature**: Optimal scaling factor (typically 1.0-2.0)
- **ECE** (Expected Calibration Error): Lower is better
  - Before: Uncalibrated ECE
  - After: Calibrated ECE
  - Improvement: Should be positive

Good calibration means confidence scores match actual accuracy.

## 🐛 Troubleshooting

### Issue: "Module not found"

**Solution**:
```powershell
cd apps\training
pip install -r requirements.txt
```

### Issue: "CUDA out of memory"

**Solution**: Reduce batch size:
```bash
python train_stage_a.py --batch_size 16
python train_stage_b.py --batch_size 16
```

### Issue: "No module named 'data_loader'"

**Solution**: Make sure you're in the `apps/training` directory:
```powershell
cd apps\training
python train_stage_a.py
```

### Issue: "Dataset not found"

**Solution**: Run data split first:
```bash
python split.py
```

This creates `train/`, `val/`, and `test/` directories from your dataset.

### Issue: Scripts won't run on Windows

**Solution**: Make sure you're using PowerShell or Command Prompt, not Git Bash:
```powershell
scripts\train_all.bat
```

## 🔄 Updating the Server

After training, the models are automatically copied to:
- `apps/server/data/models/stage_a/`
- `apps/server/data/models/stage_b/`

### Restart the Server

```powershell
cd apps\server
# Stop the current server (Ctrl+C)
uvicorn app.main:app --reload --port 8000
```

The server will automatically load the new models on startup.

## 📈 Training Best Practices

1. **Start with Stage A**: Train the binary classifier first to ensure good healthy/unhealthy separation
2. **Monitor Overfitting**: Check if validation loss increases while training loss decreases
3. **Use Calibration**: Always calibrate models for reliable confidence scores
4. **Test Both Stages**: Ensure both models work well independently before deploying
5. **Keep Artifacts**: Save all training artifacts for reproducibility and debugging

## 🎨 Training Tips

- **Data Quality**: Ensure training images are clear, well-lit, and properly labeled
- **Class Balance**: Check if some classes are underrepresented
- **Augmentation**: Consider adding more data augmentation if overfitting
- **Learning Rate**: If loss plateaus early, try reducing learning rate
- **Epochs**: If validation accuracy is still improving at epoch 20, increase epochs

## 💡 Next Steps

1. Train models: `scripts\train_all.bat`
2. Check artifacts: `artifacts/stage_a/` and `stage_b/`
3. Review metrics: `eval_summary.txt` and confusion matrices
4. Test server: `cd apps\server; python scripts\test_predict.py`
5. Deploy mobile: `cd apps\mobile; npm start`

## 📞 Support

If you encounter issues:
1. Check the error messages in the terminal
2. Verify all dependencies are installed: `pip install -r requirements.txt`
3. Ensure you have sufficient GPU memory (or use smaller batch sizes)
4. Review the troubleshooting section above

Happy training! 🌿
