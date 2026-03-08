"""
Export Stage B model for production serving
"""
import json
from pathlib import Path
from datetime import datetime
import argparse

import torch

from train_stage_b import create_stage_b_model, STAGE_B_CLASS_NAMES

ARTIFACTS_DIR = Path("artifacts/stage_b")


def export_stage_b(
    model_path: str,
    training_history_path: str,
    calibration_path: str = None,
    output_dir: Path = ARTIFACTS_DIR
):
    """Export Stage B model with metadata"""
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("Loading model checkpoint...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = create_stage_b_model()
    
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    
    # Load training history
    with open(training_history_path, 'r') as f:
        history = json.load(f)
    
    # Load calibration if available
    calibration = {}
    if calibration_path and Path(calibration_path).exists():
        with open(calibration_path, 'r') as f:
            calibration = json.load(f)
    
    # Create metadata
    metadata = {
        "model_type": "stage_b_diseases",
        "architecture": "efficientnet_v2_s",
        "stage": "B",
        "description": "Disease classifier: 5 aloe vera diseases",
        "num_classes": 5,
        "class_names": STAGE_B_CLASS_NAMES,
        "input_size": [224, 224],
        "training": {
            "epochs": checkpoint.get('epoch', history.get('epochs', 'unknown')),
            "final_train_loss": history.get('train_loss', [])[-1] if history.get('train_loss') else None,
            "final_val_loss": history.get('val_loss', [])[-1] if history.get('val_loss') else None,
            "final_val_accuracy": history.get('val_accuracy', [])[-1] if history.get('val_accuracy') else None,
            "best_val_accuracy": max(history.get('val_accuracy', [0])) if history.get('val_accuracy') else None,
        },
        "calibration": calibration,
        "export_timestamp": datetime.now().isoformat(),
        "framework": "pytorch",
        "pytorch_version": torch.__version__,
    }
    
    # Save model
    model_output_path = output_dir / "model.pt"
    torch.save({
        'model_state_dict': model.state_dict(),
        'class_names': STAGE_B_CLASS_NAMES,
        'num_classes': 5,
        'architecture': 'efficientnet_v2_s',
        'stage': 'B'
    }, model_output_path)
    
    print(f"✓ Model saved to: {model_output_path}")
    
    # Save metadata
    metadata_path = output_dir / "model_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✓ Metadata saved to: {metadata_path}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("Stage B Export Summary")
    print("=" * 60)
    print(f"Model Type: {metadata['model_type']}")
    print(f"Architecture: {metadata['architecture']}")
    print(f"Classes: {metadata['num_classes']} ({', '.join(STAGE_B_CLASS_NAMES)})")
    print(f"Training Epochs: {metadata['training']['epochs']}")
    if metadata['training']['best_val_accuracy']:
        print(f"Best Val Accuracy: {metadata['training']['best_val_accuracy']:.4f}")
    if calibration:
        print(f"Calibration Temperature: {calibration.get('temperature', 'N/A')}")
    print(f"Export Date: {metadata['export_timestamp']}")
    print("=" * 60)
    
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export Stage B model")
    parser.add_argument('--model_path', type=str,
                       default=str(ARTIFACTS_DIR / "model.pt"),
                       help='Path to model checkpoint')
    parser.add_argument('--history_path', type=str,
                       default=str(ARTIFACTS_DIR / "training_history.json"),
                       help='Path to training history')
    parser.add_argument('--calibration_path', type=str,
                       default=str(ARTIFACTS_DIR / "calibration.json"),
                       help='Path to calibration config')
    parser.add_argument('--output_dir', type=str,
                       default=str(ARTIFACTS_DIR),
                       help='Output directory')
    
    args = parser.parse_args()
    
    export_stage_b(
        args.model_path,
        args.history_path,
        args.calibration_path,
        args.output_dir
    )
