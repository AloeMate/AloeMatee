"""
Export trained model for production serving

Creates clean model checkpoint and metadata for deployment to backend server.
Ensures class ordering consistency between training and inference.
"""
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
import argparse

import torch

from data_loader import CLASS_NAMES
from train import create_model


def get_git_commit() -> Optional[str]:
    """Get current git commit hash if available"""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', 'HEAD'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def get_git_branch() -> Optional[str]:
    """Get current git branch if available"""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def export_model(
    model_path: Path,
    output_dir: Path,
    calibration_path: Optional[Path] = None,
    image_size: int = 384
) -> None:
    """
    Export trained model with metadata for serving
    
    Args:
        model_path: Path to trained model checkpoint
        output_dir: Directory to save exported artifacts
        calibration_path: Optional path to calibration.json
        image_size: Input image size (default: 384 for EfficientNetV2-S)
    """
    print("=" * 60)
    print("EXPORTING MODEL FOR PRODUCTION SERVING")
    print("=" * 60)
    
    # Load checkpoint
    print(f"\n📦 Loading model from {model_path}")
    checkpoint = torch.load(model_path, map_location='cpu')
    
    # Extract training info
    num_classes = checkpoint.get('num_classes', len(CLASS_NAMES))
    class_names = checkpoint.get('class_names', CLASS_NAMES)
    training_epoch = checkpoint.get('epoch', 'unknown')
    val_loss = checkpoint.get('val_loss', 'unknown')
    val_acc = checkpoint.get('val_acc', 'unknown')
    
    print(f"✓ Model trained for {training_epoch} epochs")
    print(f"✓ Validation loss: {val_loss}")
    print(f"✓ Validation accuracy: {val_acc}")
    print(f"✓ Number of classes: {num_classes}")
    
    # Verify class ordering
    if class_names != CLASS_NAMES:
        print("\n⚠️  WARNING: Class names mismatch detected!")
        print(f"   Checkpoint classes: {class_names}")
        print(f"   Expected classes: {CLASS_NAMES}")
        raise ValueError("Class name ordering mismatch. Cannot export safely.")
    
    print(f"\n✓ Class ordering verified:")
    for idx, name in enumerate(class_names):
        print(f"   {idx}: {name}")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save clean model checkpoint
    model_output_path = output_dir / 'model.pt'
    
    # Create minimal checkpoint for serving (remove optimizer state)
    serving_checkpoint = {
        'model_state_dict': checkpoint['model_state_dict'],
        'num_classes': num_classes,
        'class_names': class_names,
        'epoch': training_epoch,
        'val_loss': val_loss,
        'val_acc': val_acc
    }
    
    torch.save(serving_checkpoint, model_output_path)
    print(f"\n✓ Saved model checkpoint to {model_output_path}")
    
    # Get model size
    model_size_mb = model_output_path.stat().st_size / (1024 * 1024)
    print(f"  Model size: {model_size_mb:.2f} MB")
    
    # Load calibration if available
    temperature = 1.0
    thresholds = {"HIGH": 0.80, "MEDIUM": 0.60}
    
    if calibration_path and calibration_path.exists():
        print(f"\n🌡️  Loading calibration from {calibration_path}")
        with open(calibration_path, 'r') as f:
            calibration_config = json.load(f)
            temperature = calibration_config.get('temperature', 1.0)
            thresholds = calibration_config.get('thresholds', thresholds)
        print(f"✓ Temperature: {temperature:.4f}")
        print(f"✓ Thresholds: {thresholds}")
    else:
        print(f"\n⚠️  No calibration file found. Using default temperature=1.0")
        print(f"   Run: python calibrate.py to improve probability calibration")
    
    # Get git information
    git_commit = get_git_commit()
    git_branch = get_git_branch()
    
    if git_commit:
        print(f"\n✓ Git commit: {git_commit[:8]}")
        if git_branch:
            print(f"✓ Git branch: {git_branch}")
    else:
        print(f"\n⚠️  Git information not available")
    
    # Create metadata
    metadata = {
        "model_name": "efficientnetv2-s",
        "model_architecture": "EfficientNetV2-S",
        "framework": "PyTorch",
        "num_classes": num_classes,
        "class_names": class_names,
        "class_to_idx": {name: idx for idx, name in enumerate(class_names)},
        "idx_to_class": {idx: name for idx, name in enumerate(class_names)},
        "image_size": image_size,
        "input_shape": [3, image_size, image_size],
        "normalization": {
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225],
            "description": "ImageNet statistics"
        },
        "preprocessing": {
            "resize_to": image_size + 32,
            "center_crop": image_size,
            "channels": "RGB",
            "dtype": "float32",
            "range": "[0, 1] after ToTensor, then normalized"
        },
        "calibration": {
            "temperature": temperature,
            "is_calibrated": temperature != 1.0,
            "thresholds": thresholds
        },
        "training": {
            "epochs": training_epoch,
            "val_loss": float(val_loss) if isinstance(val_loss, (int, float)) else val_loss,
            "val_acc": float(val_acc) if isinstance(val_acc, (int, float)) else val_acc,
            "pretrained_on": "ImageNet"
        },
        "export": {
            "exported_at": datetime.now().isoformat(),
            "git_commit": git_commit,
            "git_branch": git_branch,
            "model_size_mb": round(model_size_mb, 2)
        },
        "usage": {
            "load_model": "model = create_model(num_classes=6); model.load_state_dict(checkpoint['model_state_dict'])",
            "preprocess": "Resize(416) -> CenterCrop(384) -> ToTensor() -> Normalize(mean, std)",
            "inference": "logits = model(images); calibrated_logits = logits / temperature; probs = softmax(calibrated_logits)",
            "confidence_thresholds": "HIGH >= 0.80, MEDIUM [0.60, 0.80), LOW < 0.60"
        }
    }
    
    # Save metadata
    metadata_path = output_dir / 'model_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✓ Saved metadata to {metadata_path}")
    
    # Save class names as separate file for quick reference
    class_names_path = output_dir / 'class_names.json'
    class_names_data = {
        "class_names": class_names,
        "class_to_idx": {name: idx for idx, name in enumerate(class_names)},
        "idx_to_class": {str(idx): name for idx, name in enumerate(class_names)}
    }
    with open(class_names_path, 'w') as f:
        json.dump(class_names_data, f, indent=2)
    
    print(f"✓ Saved class names to {class_names_path}")
    
    # Validation check
    print(f"\n🔍 Validation Checks:")
    print(f"  ✓ Model checkpoint: {model_output_path.exists()}")
    print(f"  ✓ Metadata: {metadata_path.exists()}")
    print(f"  ✓ Class names: {class_names_path.exists()}")
    print(f"  ✓ Class count matches: {num_classes == len(class_names)}")
    print(f"  ✓ Class ordering consistent: {class_names == CLASS_NAMES}")
    
    # Print deployment instructions
    print("\n" + "=" * 60)
    print("EXPORT COMPLETE!")
    print("=" * 60)
    print(f"\n📦 Artifacts ready for deployment:")
    print(f"  {model_output_path}")
    print(f"  {metadata_path}")
    print(f"  {class_names_path}")
    
    print(f"\n📋 Next Steps:")
    print(f"  1. Copy artifacts to backend:")
    print(f"     cp {output_dir}/model.pt ../server/data/models/")
    print(f"     cp {output_dir}/model_metadata.json ../server/data/models/")
    print(f"  ")
    print(f"  2. Update backend inference service:")
    print(f"     - Load model from model.pt")
    print(f"     - Apply temperature scaling: logits / {temperature:.4f}")
    print(f"     - Use class_names ordering: {class_names}")
    print(f"  ")
    print(f"  3. Test inference endpoint:")
    print(f"     curl -X POST http://localhost:8000/api/v1/predict -F 'image1=@test.jpg'")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export model for production serving")
    parser.add_argument('--model_path', type=str, default='./artifacts/model.pt',
                        help='Path to trained model checkpoint')
    parser.add_argument('--output_dir', type=str, default='./artifacts',
                        help='Output directory for exported artifacts')
    parser.add_argument('--calibration_path', type=str, default='./artifacts/calibration.json',
                        help='Path to calibration.json (optional)')
    parser.add_argument('--image_size', type=int, default=384,
                        help='Input image size (default: 384 for EfficientNetV2-S)')
    
    args = parser.parse_args()
    
    model_path = Path(args.model_path).resolve()
    output_dir = Path(args.output_dir).resolve()
    calibration_path = Path(args.calibration_path).resolve() if args.calibration_path else None
    
    if not model_path.exists():
        print(f"❌ Error: Model not found at {model_path}")
        print(f"   Run: python train.py first")
        exit(1)
    
    export_model(
        model_path=model_path,
        output_dir=output_dir,
        calibration_path=calibration_path,
        image_size=args.image_size
    )
