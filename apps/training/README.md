# AloeVeraMate Training Pipeline

Complete PyTorch training pipeline for aloe vera disease detection using EfficientNetV2-S.

## Features

- **Model:** EfficientNetV2-S pretrained on ImageNet
- **Classes:** 6-class classification (Aloe Rot, Aloe Rust, Anthracnose, Healthy, Leaf Spot, Sunburn)
- **Auto Dataset Detection:** Supports both ImageFolder and CSV manifest formats
- **Class Imbalance Handling:** Automatic class weighting
- **Data Augmentation:** Plant-specific augmentations (rotation, flip, color jitter, etc.)
- **Early Stopping:** Prevents overfitting
- **Calibration:** Temperature scaling for better probability estimates
- **Comprehensive Evaluation:** Confusion matrix, per-class metrics, macro F1, ECE

## Setup

### 1. Install Dependencies

```bash
cd apps/training
pip install -r requirements.txt
```

**Requirements:**
- PyTorch 2.1+
- torchvision
- scikit-learn
- matplotlib, seaborn
- pandas, numpy
- tqdm

### 2. Verify Dataset

Ensure dataset is organized in one of these formats:

**Option A: Folder-per-class** (auto-detected)
```
dataset/Aloe Vera Leaf Disease Detection Dataset/
├── Aloe Rot/
├── Aloe Rust/
├── Anthracnose/
├── Healthy/
├── Leaf Spot/
└── Sunburn/
```

**Option B: CSV Manifest** (auto-detected)
```
dataset/manifest.csv
```

## Usage

### Step 1: Create Train/Val/Test Splits

If your dataset doesn't have splits yet:

```bash
python split.py --dataset_root ../../dataset --output_dir ./splits
```

**Arguments:**
- `--dataset_root`: Path to dataset root (default: `../../dataset`)
- `--output_dir`: Output directory for split CSV files (default: `./splits`)
- `--train_ratio`: Training set ratio (default: 0.8)
- `--val_ratio`: Validation set ratio (default: 0.1)
- `--test_ratio`: Test set ratio (default: 0.1)
- `--seed`: Random seed (default: 42)

**Output:**
- `splits/train.csv` (80% of data)
- `splits/val.csv` (10% of data)
- `splits/test.csv` (10% of data)

**Features:**
- ✅ Stratified splitting (maintains class distribution)
- ✅ Duplicate detection (groups augmented images from same session)
- ✅ No data leakage between splits

### Step 2: Train Model

```bash
python train.py --dataset_root ../../dataset --split_dir ./splits --output_dir ./artifacts
```

**Arguments:**
- `--dataset_root`: Path to dataset root (default: `../../dataset`)
- `--split_dir`: Directory with split CSV files (default: `./splits`)
- `--output_dir`: Output directory for checkpoints (default: `./artifacts`)
- `--epochs`: Number of training epochs (default: 30)
- `--batch_size`: Batch size (default: 32)
- `--lr`: Learning rate (default: 1e-4)
- `--weight_decay`: L2 regularization (default: 1e-4)
- `--num_workers`: Data loading workers (default: 4)
- `--device`: Device to train on [cuda|cpu] (default: cuda)
- `--no_class_weights`: Disable class weights (not recommended)
- `--patience`: Early stopping patience (default: 5)

**Output:**
- `artifacts/model.pt` - Best model checkpoint
- `artifacts/metrics.json` - Training history and metrics

**Training Features:**
- ✅ EfficientNetV2-S with ImageNet pretraining
- ✅ Class weighting for imbalanced dataset
- ✅ Data augmentation (crop, flip, rotation, color jitter)
- ✅ Early stopping with patience
- ✅ Learning rate scheduling (ReduceLROnPlateau)
- ✅ Progress bars with live metrics
- ✅ GPU acceleration (if available)

**Example with custom settings:**
```bash
python train.py \
  --epochs 50 \
  --batch_size 64 \
  --lr 3e-4 \
  --patience 7 \
  --device cuda
```

### Step 3: Calibrate Model (Recommended)

```bash
python calibrate.py --model_path ./artifacts/model.pt --dataset_root ../../dataset --split_dir ./splits
```

**What is calibration?**  
Calibration improves probability estimates using temperature scaling. A well-calibrated model's confidence matches its accuracy (e.g., 80% confidence → 80% correct).

**Output:**
- `artifacts/calibration.json` - Temperature parameter and thresholds

**Why calibrate?**
- ✅ Better confidence estimates for clinical decisions
- ✅ More reliable "retake photo" recommendations
- ✅ Improved Expected Calibration Error (ECE)

### Step 4: Evaluate Model

```bash
python eval.py --model_path ./artifacts/model.pt --dataset_root ../../dataset --split_dir ./splits --calibration_path ./artifacts/calibration.json
```

**Arguments:**
- `--model_path`: Path to trained model (default: `./artifacts/model.pt`)
- `--dataset_root`: Path to dataset root (default: `../../dataset`)
- `--split_dir`: Directory with split CSV files (default: `./splits`)
- `--output_dir`: Output directory for results (default: `./artifacts`)
- `--batch_size`: Batch size (default: 32)
- `--num_workers`: Data loading workers (default: 4)
- `--device`: Device [cuda|cpu] (default: cuda)
- `--calibration_path`: Path to calibration.json (optional, for temperature scaling)

**Output:**
- `artifacts/confusion_matrix.png` - Normalized confusion matrix
- `artifacts/confusion_matrix_raw.png` - Raw counts confusion matrix
- `artifacts/per_class_metrics.png` - Bar chart of precision/recall/F1 per class
- `artifacts/reliability_diagram.png` - Calibration quality visualization
- `artifacts/evaluation_results.json` - Complete metrics in JSON
- `artifacts/calibration_report.json` - ECE and reliability data

**Metrics Computed:**
- ✅ Overall accuracy
- ✅ Per-class precision, recall, F1-score
- ✅ Macro-averaged precision, recall, F1
- ✅ Confusion matrix
- ✅ Classification report
- ✅ Expected Calibration Error (ECE)
- ✅ Reliability diagram

### Step 5: Export for Serving

```bash
python export.py --model_path ./artifacts/model.pt --calibration_path ./artifacts/calibration.json
```

**What gets exported:**
- `artifacts/model.pt` - Clean model checkpoint (without optimizer state, smaller file)
- `artifacts/model_metadata.json` - Complete metadata for reproducible inference
- `artifacts/class_names.json` - Class ordering reference

**Model Metadata Includes:**
- Model architecture (EfficientNetV2-S)
- Class names in correct index order (0: Aloe Rot, 1: Aloe Rust, ...)
- Image preprocessing requirements (384x384, ImageNet normalization)
- Calibration parameters (temperature scaling)
- Training metrics (epochs, validation loss/accuracy)
- Git commit hash (if available)
- Export timestamp

**Why export?**
- ✅ Clean checkpoint (smaller file size, no optimizer state)
- ✅ Comprehensive metadata for reproducibility
- ✅ Verified class ordering consistency
- ✅ Calibration settings included
- ✅ Git tracking for model versioning

**Critical: Class Index Ordering**
```json
{
  "0": "Aloe Rot",
  "1": "Aloe Rust",
  "2": "Anthracnose",
  "3": "Healthy",
  "4": "Leaf Spot",
  "5": "Sunburn"
}
```

This ordering **must** match between training and inference to ensure correct predictions.

## Complete Workflow

```bash
# 1. Create splits (one-time)
python split.py

# 2. Train model
python train.py --epochs 30 --batch_size 32

# 3. Calibrate model (recommended)
python calibrate.py

# 4. Evaluate on test set
python eval.py --calibration_path ./artifacts/calibration.json

# 5. Export for serving
python export.py

# Check results
ls artifacts/
# model.pt, model_metadata.json, class_names.json, metrics.json, calibration.json,
# confusion_matrix.png, per_class_metrics.png, reliability_diagram.png,
# evaluation_results.json, calibration_report.json
```

## Directory Structure

```
apps/training/
├── data_loader.py          # Dataset loading utilities
├── split.py                # Create train/val/test splits
├── train.py                # Training script
├── calibrate.py            # Temperature scaling calibration
├── eval.py                 # Evaluation script with ECE
├── export.py               # Export model for serving
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── splits/                # Dataset splits (generated)
│   ├── train.csv
│   ├── val.csv
│   └── test.csv
└── artifacts/             # Training outputs (generated)
    ├── model.pt           # Best model checkpoint
    ├── model_metadata.json # Export metadata
    ├── class_names.json   # Class ordering reference
    ├── metrics.json       # Training metrics
    ├── calibration.json   # Temperature scaling config
    ├── confusion_matrix.png
    ├── per_class_metrics.png
    ├── reliability_diagram.png
    ├── evaluation_results.json
    └── calibration_report.json
```

## Model Architecture

**EfficientNetV2-S:**
- Input size: 384x384 RGB
- Pretrained on ImageNet
- Modified classifier head for 6 classes
- ~22M trainable parameters

**Preprocessing:**
- Resize to 384x384 (training: random crop, val/test: center crop)
- Normalize: ImageNet stats (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])

**Data Augmentation (Training Only):**
- Random resized crop (scale 0.8-1.0)
- Random horizontal flip (p=0.5)
- Random rotation (±15°)
- Color jitter (brightness, contrast, saturation, hue)

## Hyperparameters

**Recommended Settings:**
```python
epochs = 30
batch_size = 32  # Adjust based on GPU memory
learning_rate = 1e-4
weight_decay = 1e-4
optimizer = AdamW
scheduler = ReduceLROnPlateau(factor=0.5, patience=3)
early_stopping_patience = 5
```

**For faster training (less accuracy):**
```bash
python train.py --epochs 20 --batch_size 64 --lr 3e-4
```

**For higher accuracy (slower):**
```bash
python train.py --epochs 50 --batch_size 16 --lr 5e-5 --patience 10
```

## Expected Performance

Based on dataset characteristics:

- **Accuracy:** 85-95% (depends on data quality)
- **Macro F1:** 80-90%
- **Training time:** ~10-30 minutes per epoch (GPU), ~1-2 hours per epoch (CPU)
- **Convergence:** 15-25 epochs typically

**Per-class performance may vary due to class imbalance:**
- Healthy: Highest (most samples)
- Aloe Rot: Lowest (fewest samples, 100 images)

## Calibration Details

**Temperature Scaling:**
- Post-hoc calibration method (Guo et al., ICML 2017)
- Learns single scalar T to scale logits: `calibrated_probs = softmax(logits / T)`
- Optimized on validation set to minimize negative log-likelihood
- Does not change predictions, only improves probability estimates

**Expected Calibration Error (ECE):**
- Measures gap between confidence and accuracy
- Bins predictions by confidence (10 bins)
- Computes weighted average: `ECE = Σ (|accuracy - confidence|) × bin_weight`
- **Interpretation:**
  - ECE < 0.05: Excellent calibration
  - ECE < 0.10: Good calibration
  - ECE < 0.15: Moderate (temperature scaling recommended)
  - ECE ≥ 0.15: Poor calibration

**Reliability Diagram:**
- X-axis: Predicted confidence
- Y-axis: Actual accuracy
- Perfect calibration: points on diagonal line
- Red bars: calibration gap for each bin

## Integration with Backend

### Step 1: Copy Artifacts to Backend

```bash
# Copy model and metadata
cp artifacts/model.pt ../server/data/models/efficientnet_v2_s.pth
cp artifacts/model_metadata.json ../server/data/models/
```

### Step 2: Update Backend Inference Service

Edit `apps/server/app/services/inference.py`:

```python
import torch
import json
from pathlib import Path
from torchvision import models, transforms
from PIL import Image
import io

class PyTorchInferenceService(DiseaseInferenceService):
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load metadata
        metadata_path = Path(__file__).parent.parent / 'data' / 'models' / 'model_metadata.json'
        with open(metadata_path) as f:
            self.metadata = json.load(f)
        
        # Load model
        model_path = Path(__file__).parent.parent / 'data' / 'models' / 'efficientnet_v2_s.pth'
        checkpoint = torch.load(model_path, map_location=self.device)
        
        self.model = models.efficientnet_v2_s(weights=None)
        in_features = self.model.classifier[-1].in_features
        self.model.classifier[-1] = torch.nn.Linear(in_features, self.metadata['num_classes'])
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        # Get calibration temperature
        self.temperature = self.metadata['calibration']['temperature']
        
        # Setup preprocessing
        self.transform = transforms.Compose([
            transforms.Resize(416),
            transforms.CenterCrop(384),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=self.metadata['normalization']['mean'],
                std=self.metadata['normalization']['std']
            )
        ])
    
    def predict(self, images: List[bytes]) -> List[InferenceResult]:
        results = []
        
        for img_bytes in images:
            # Load image
            image = Image.open(io.BytesIO(img_bytes)).convert('RGB')
            
            # Preprocess
            input_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Inference
            with torch.no_grad():
                logits = self.model(input_tensor)
                # Apply temperature scaling
                calibrated_logits = logits / self.temperature
                probs = torch.softmax(calibrated_logits, dim=1)
            
            # Get top predictions
            top_probs, top_indices = torch.topk(probs, k=3)
            
            for prob, idx in zip(top_probs[0], top_indices[0]):
                class_name = self.metadata['class_names'][idx.item()]
                disease_id = class_name.lower().replace(' ', '_')
                
                results.append(InferenceResult(
                    disease_id=disease_id,
                    disease_name=class_name,
                    confidence=prob.item()
                ))
        
        return results
```

### Step 3: Update Factory Function

In `get_inference_service()`, replace placeholder:

```python
def get_inference_service() -> DiseaseInferenceService:
    # Use PyTorch model
    return PyTorchInferenceService()
```

### Step 4: Test Inference

```bash
# Start server
cd apps/server
uvicorn app.main:app --reload

# Test prediction
curl -X POST "http://localhost:8000/api/v1/predict" \
  -F "image1=@test_image.jpg" \
  -F "image2=@test_image.jpg" \
  -F "image3=@test_image.jpg"
```

**Expected Response:**
```json
{
  "predictions": [
    {
      "disease_id": "healthy",
      "disease_name": "Healthy",
      "confidence": 0.92,
      "description": "...",
      "severity": "none"
    },
    ...
  ],
  "confidence_level": "HIGH",
  "retake_message": null
}
```

## Troubleshooting

### Out of Memory (GPU)
```bash
python train.py --batch_size 16  # Reduce batch size
```

### Slow Training
```bash
python train.py --num_workers 8  # Increase workers (if CPU has cores)
```

### Model Not Improving
- Check learning rate (try 5e-5 or 3e-4)
- Increase patience (--patience 10)
- Check data quality (corrupted images?)
- Verify splits are stratified

### Overfitting
- Already using: weight decay, early stopping, data augmentation
- Try: smaller batch size, higher weight decay (1e-3)

### Underfitting
- Train longer (--epochs 50)
- Higher learning rate (--lr 3e-4)
- Remove weight decay (--weight_decay 0)

## Citation

**EfficientNetV2:**
```
Tan, M., & Le, Q. (2021). EfficientNetV2: Smaller Models and Faster Training.
International Conference on Machine Learning (ICML).
```

**Temperature Scaling:**
```
Guo, C., Pleiss, G., Sun, Y., & Weinberger, K. Q. (2017).
On Calibration of Modern Neural Networks.
International Conference on Machine Learning (ICML).
```

**PyTorch:**
```
Paszke, A., et al. (2019). PyTorch: An Imperative Style, High-Performance Deep Learning Library.
Advances in Neural Information Processing Systems 32.
```

## License

MIT License (or your project license)

---

**Questions?** Open an issue or contact the development team.
