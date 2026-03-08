"""
Evaluation script for Stage A: Binary Classifier (Healthy vs Unhealthy)
"""
import json
from pathlib import Path
import argparse

import torch
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score
from tqdm import tqdm

from data_loader import load_dataset
from train_stage_a import create_stage_a_model, STAGE_A_CLASS_NAMES

ARTIFACTS_DIR = Path("artifacts/stage_a")


def evaluate_stage_a(model_path: str, calibration_path: str = None):
    """Evaluate Stage A binary classifier"""
    
    print("Loading test dataset...")
    _, _, test_loader = load_dataset(batch_size=32, stage='A')
    
    print("Loading model...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = create_stage_a_model().to(device)
    
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # Load calibration if available
    temperature = 1.0
    if calibration_path and Path(calibration_path).exists():
        with open(calibration_path, 'r') as f:
            calib = json.load(f)
            temperature = calib.get('temperature', 1.0)
        print(f"Using temperature scaling: T={temperature:.4f}")
    
    print("\nEvaluating on test set...")
    all_preds = []
    all_labels = []
    all_probs = []
    
    with torch.no_grad():
        for images, labels in tqdm(test_loader, desc="Testing"):
            images = images.to(device)
            labels = labels.to(device)
            
            outputs = model(images)
            # Apply temperature scaling
            scaled_outputs = outputs / temperature
            probs = torch.softmax(scaled_outputs, dim=1)
            preds = torch.argmax(probs, dim=1)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())
    
    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)
    
    # Compute metrics
    accuracy = accuracy_score(all_labels, all_preds)
    print(f"\nTest Accuracy: {accuracy:.4f}")
    
    # Confusion matrix
    cm = confusion_matrix(all_labels, all_preds)
    
    # Plot confusion matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=STAGE_A_CLASS_NAMES,
                yticklabels=STAGE_A_CLASS_NAMES)
    plt.title('Stage A: Binary Classification Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    cm_path = ARTIFACTS_DIR / "confusion_matrix.png"
    plt.savefig(cm_path, dpi=150, bbox_inches='tight')
    print(f"Confusion matrix saved to: {cm_path}")
    
    # Classification report
    report = classification_report(all_labels, all_preds, 
                                   target_names=STAGE_A_CLASS_NAMES,
                                   digits=4)
    print("\nClassification Report:")
    print(report)
    
    # Save summary
    summary_path = ARTIFACTS_DIR / "eval_summary.txt"
    with open(summary_path, 'w') as f:
        f.write("Stage A: Binary Classifier Evaluation\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Test Accuracy: {accuracy:.4f}\n\n")
        f.write("Classification Report:\n")
        f.write(report)
        f.write("\n\nConfusion Matrix:\n")
        f.write(str(cm))
    
    print(f"\nEvaluation summary saved to: {summary_path}")
    
    return {
        'accuracy': float(accuracy),
        'confusion_matrix': cm.tolist(),
        'predictions': all_preds.tolist(),
        'labels': all_labels.tolist(),
        'probabilities': all_probs.tolist()
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Stage A model")
    parser.add_argument('--model_path', type=str, 
                       default=str(ARTIFACTS_DIR / "model.pt"),
                       help='Path to model checkpoint')
    parser.add_argument('--calibration_path', type=str,
                       default=str(ARTIFACTS_DIR / "calibration.json"),
                       help='Path to calibration config')
    
    args = parser.parse_args()
    
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    evaluate_stage_a(args.model_path, args.calibration_path)
