"""
Evaluation script for AloeVeraMate disease detection model

Produces:
- Confusion matrix
- Per-class precision, recall, F1-score
- Macro F1-score
- Classification report
- Calibration metrics
"""
import json
from pathlib import Path
from typing import Dict, Any
import argparse

import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix, classification_report, 
    precision_recall_fscore_support, accuracy_score
)
from tqdm import tqdm

from data_loader import load_dataset, CLASS_NAMES
from train import create_model


def compute_ece(max_probs: np.ndarray, preds: np.ndarray, labels: np.ndarray, n_bins: int = 10) -> Dict[str, Any]:
    """
    Compute Expected Calibration Error (ECE)
    
    ECE measures the difference between predicted confidence and actual accuracy
    across different confidence bins.
    
    Args:
        max_probs: Max probabilities for each prediction (N,)
        preds: Predicted classes (N,)
        labels: True labels (N,)
        n_bins: Number of bins for calibration curve
    
    Returns:
        Dict with ECE, bin data, and reliability diagram data
    """
    # Create bins
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    bin_lowers = bin_boundaries[:-1]
    bin_uppers = bin_boundaries[1:]
    
    # Storage for bin statistics
    bin_accuracies = []
    bin_confidences = []
    bin_counts = []
    
    ece = 0.0
    total_samples = len(labels)
    
    for bin_lower, bin_upper in zip(bin_lowers, bin_uppers):
        # Find samples in this bin
        in_bin = (max_probs > bin_lower) & (max_probs <= bin_upper)
        bin_count = in_bin.sum()
        
        if bin_count > 0:
            # Accuracy of predictions in this bin
            bin_accuracy = (preds[in_bin] == labels[in_bin]).mean()
            # Average confidence in this bin
            bin_confidence = max_probs[in_bin].mean()
            
            # Contribution to ECE (weighted by bin size)
            ece += (bin_count / total_samples) * abs(bin_accuracy - bin_confidence)
            
            bin_accuracies.append(float(bin_accuracy))
            bin_confidences.append(float(bin_confidence))
            bin_counts.append(int(bin_count))
        else:
            bin_accuracies.append(0.0)
            bin_confidences.append(0.0)
            bin_counts.append(0)
    
    return {
        'ece': float(ece),
        'n_bins': n_bins,
        'bin_boundaries': bin_boundaries.tolist(),
        'bin_accuracies': bin_accuracies,
        'bin_confidences': bin_confidences,
        'bin_counts': bin_counts
    }


@torch.no_grad()
def evaluate_model(
    model: nn.Module,
    dataloader,
    device: torch.device,
    class_names: list,
    temperature: float = 1.0
) -> Dict[str, Any]:
    """
    Evaluate model and return metrics
    
    Args:
        model: PyTorch model
        dataloader: Test data loader
        device: Device for computation
        class_names: List of class names
        temperature: Temperature scaling parameter for calibration
    
    Returns:
        Dictionary with predictions, labels, and metrics
    """
    model.eval()
    
    all_preds = []
    all_labels = []
    all_max_probs = []
    
    print(f"\n🔍 Running inference on test set (temperature={temperature:.4f})...")
    for inputs, labels in tqdm(dataloader, desc="Evaluating"):
        inputs = inputs.to(device)
        labels = labels.to(device)
        
        outputs = model(inputs)
        
        # Apply temperature scaling
        if temperature != 1.0:
            outputs = outputs / temperature
        
        probs = torch.softmax(outputs, dim=1)
        max_probs, preds = torch.max(probs, dim=1)
        
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        all_max_probs.extend(max_probs.cpu().numpy())
    
    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_max_probs = np.array(all_max_probs)
    
    # Calculate metrics
    accuracy = accuracy_score(all_labels, all_preds)
    
    # Compute calibration metrics
    calibration_metrics = compute_ece(all_max_probs, all_preds, all_labels, n_bins=10)
    
    # Per-class metrics
    precision, recall, f1, support = precision_recall_fscore_support(
        all_labels, all_preds, average=None, zero_division=0
    )
    
    # Macro averages
    macro_precision, macro_recall, macro_f1, _ = precision_recall_fscore_support(
        all_labels, all_preds, average='macro', zero_division=0
    )
    
    # Weighted averages
    weighted_precision, weighted_recall, weighted_f1, _ = precision_recall_fscore_support(
        all_labels, all_preds, average='weighted', zero_division=0
    )
    
    # Confusion matrix
    cm = confusion_matrix(all_labels, all_preds)
    
    return {
        'accuracy': accuracy,
        'confusion_matrix': cm,
        'per_class_precision': precision,
        'per_class_recall': recall,
        'per_class_f1': f1,
        'per_class_support': support,
        'macro_precision': macro_precision,
        'macro_recall': macro_recall,
        'macro_f1': macro_f1,
        'weighted_precision': weighted_precision,
        'weighted_recall': weighted_recall,
        'weighted_f1': weighted_f1,
        'calibration': calibration_metrics
    }


def plot_confusion_matrix(
    cm: np.ndarray,
    class_names: list,
    output_path: Path,
    normalize: bool = True
):
    """Plot and save confusion matrix"""
    if normalize:
        cm_display = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        fmt = '.2f'
        title = 'Normalized Confusion Matrix'
    else:
        cm_display = cm
        fmt = 'd'
        title = 'Confusion Matrix'
    
    plt.figure(figsize=(12, 10))
    sns.heatmap(
        cm_display,
        annot=True,
        fmt=fmt,
        cmap='Blues',
        xticklabels=class_names,
        yticklabels=class_names,
        cbar_kws={'label': 'Proportion' if normalize else 'Count'}
    )
    plt.title(title, fontsize=16, pad=20)
    plt.ylabel('True Label', fontsize=12)
    plt.xlabel('Predicted Label', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"✓ Saved confusion matrix to {output_path}")


def plot_per_class_metrics(
    precision: np.ndarray,
    recall: np.ndarray,
    f1: np.ndarray,
    class_names: list,
    output_path: Path
):
    """Plot per-class metrics as bar chart"""
    x = np.arange(len(class_names))
    width = 0.25
    
    fig, ax = plt.subplots(figsize=(14, 8))
    
    bars1 = ax.bar(x - width, precision, width, label='Precision', color='#2E7D32')
    bars2 = ax.bar(x, recall, width, label='Recall', color='#1976D2')
    bars3 = ax.bar(x + width, f1, width, label='F1-Score', color='#F57C00')
    
    ax.set_xlabel('Class', fontsize=12)
    ax.set_ylabel('Score', fontsize=12)
    ax.set_title('Per-Class Performance Metrics', fontsize=16, pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(class_names, rotation=45, ha='right')
    ax.legend(fontsize=11)
    ax.set_ylim(0, 1.0)
    ax.grid(axis='y', alpha=0.3)
    
    # Add value labels on bars
    def add_labels(bars):
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.2f}',
                   ha='center', va='bottom', fontsize=8)
    
    add_labels(bars1)
    add_labels(bars2)
    add_labels(bars3)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"✓ Saved per-class metrics to {output_path}")


def plot_reliability_diagram(
    calibration_data: Dict[str, Any],
    output_path: Path
):
    """Plot reliability diagram for calibration assessment"""
    bin_confidences = calibration_data['bin_confidences']
    bin_accuracies = calibration_data['bin_accuracies']
    bin_counts = calibration_data['bin_counts']
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Plot perfect calibration line
    ax.plot([0, 1], [0, 1], 'k--', label='Perfect Calibration', linewidth=2)
    
    # Plot actual calibration - only plot bins with samples
    valid_bins = [i for i, count in enumerate(bin_counts) if count > 0]
    valid_confidences = [bin_confidences[i] for i in valid_bins]
    valid_accuracies = [bin_accuracies[i] for i in valid_bins]
    valid_counts = [bin_counts[i] for i in valid_bins]
    
    # Size of markers proportional to bin count
    if valid_counts:
        max_count = max(valid_counts)
        sizes = [100 + (count / max_count) * 500 for count in valid_counts]
        
        ax.scatter(
            valid_confidences, valid_accuracies,
            s=sizes, alpha=0.6, c='#1976D2',
            label='Model Calibration'
        )
        
        # Connect points
        ax.plot(valid_confidences, valid_accuracies, 'o-', color='#1976D2', alpha=0.5)
        
        # Add gap bars
        for conf, acc in zip(valid_confidences, valid_accuracies):
            ax.plot([conf, conf], [conf, acc], 'r-', alpha=0.3, linewidth=2)
    
    ax.set_xlabel('Confidence (Predicted Probability)', fontsize=12)
    ax.set_ylabel('Accuracy (Actual Correctness)', fontsize=12)
    ax.set_title(f"Reliability Diagram (ECE: {calibration_data['ece']:.4f})", fontsize=14, pad=15)
    ax.legend(fontsize=11)
    ax.grid(alpha=0.3)
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1])
    ax.set_aspect('equal')
    
    # Add text with ECE
    ax.text(
        0.05, 0.95,
        f"ECE = {calibration_data['ece']:.4f}\nBins = {calibration_data['n_bins']}",
        transform=ax.transAxes,
        fontsize=11,
        verticalalignment='top',
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5)
    )
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"✓ Saved reliability diagram to {output_path}")


def print_evaluation_summary(results: Dict[str, Any], class_names: list):
    """Print evaluation summary to console"""
    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    
    print(f"\n📊 Overall Metrics:")
    print(f"  Accuracy: {results['accuracy']*100:.2f}%")
    print(f"  Macro Precision: {results['macro_precision']*100:.2f}%")
    print(f"  Macro Recall: {results['macro_recall']*100:.2f}%")
    print(f"  Macro F1-Score: {results['macro_f1']*100:.2f}%")
    
    print(f"\n🎯 Calibration Metrics:")
    print(f"  Expected Calibration Error (ECE): {results['calibration']['ece']:.4f}")
    if results['calibration']['ece'] < 0.05:
        print(f"  → Excellent calibration!")
    elif results['calibration']['ece'] < 0.10:
        print(f"  → Good calibration")
    elif results['calibration']['ece'] < 0.15:
        print(f"  → Moderate calibration (consider temperature scaling)")
    else:
        print(f"  → Poor calibration (temperature scaling recommended)")
    
    print(f"\n📈 Per-Class Metrics:")
    print("-" * 60)
    print(f"{'Class':<20} {'Precision':>10} {'Recall':>10} {'F1-Score':>10} {'Support':>10}")
    print("-" * 60)
    
    for i, name in enumerate(class_names):
        print(f"{name:<20} "
              f"{results['per_class_precision'][i]*100:>9.2f}% "
              f"{results['per_class_recall'][i]*100:>9.2f}% "
              f"{results['per_class_f1'][i]*100:>9.2f}% "
              f"{results['per_class_support'][i]:>10d}")
    
    print("-" * 60)
    print(f"{'Macro Average':<20} "
          f"{results['macro_precision']*100:>9.2f}% "
          f"{results['macro_recall']*100:>9.2f}% "
          f"{results['macro_f1']*100:>9.2f}%")
    
    # Find best and worst performing classes
    best_idx = np.argmax(results['per_class_f1'])
    worst_idx = np.argmin(results['per_class_f1'])
    
    print(f"\n🏆 Best performing class: {class_names[best_idx]} (F1: {results['per_class_f1'][best_idx]*100:.2f}%)")
    print(f"⚠️  Worst performing class: {class_names[worst_idx]} (F1: {results['per_class_f1'][worst_idx]*100:.2f}%)")
    
    print("\n" + "=" * 60)


def save_per_class_csv(
    precision: np.ndarray,
    recall: np.ndarray,
    f1: np.ndarray,
    support: np.ndarray,
    class_names: list,
    output_path: Path
):
    """Save per-class metrics to CSV file"""
    df = pd.DataFrame({
        'Class': class_names,
        'Precision': precision,
        'Recall': recall,
        'F1-Score': f1,
        'Support': support.astype(int)
    })
    df.to_csv(output_path, index=False)
    print(f"✓ Saved per-class metrics CSV to {output_path}")


def create_eval_summary_txt(
    results: Dict[str, Any],
    class_names: list,
    output_path: Path
):
    """Create evaluation summary text file with analysis"""
    cm = results['confusion_matrix']
    f1_scores = results['per_class_f1']
    
    # Find strongest and weakest classes
    strongest_idx = np.argmax(f1_scores)
    weakest_idx = np.argmin(f1_scores)
    
    # Find most confused pairs (top 3 off-diagonal confusion matrix entries)
    confused_pairs = []
    for i in range(len(class_names)):
        for j in range(len(class_names)):
            if i != j:
                confused_pairs.append((cm[i, j], i, j))
    confused_pairs.sort(reverse=True)
    top_confused = confused_pairs[:3]
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("=" * 70 + "\n")
        f.write("ALOE VERA DISEASE DETECTION - EVALUATION SUMMARY\n")
        f.write("=" * 70 + "\n\n")
        
        f.write("OVERALL PERFORMANCE\n")
        f.write("-" * 70 + "\n")
        f.write(f"Accuracy:        {results['accuracy']*100:.2f}%\n")
        f.write(f"Macro Precision: {results['macro_precision']*100:.2f}%\n")
        f.write(f"Macro Recall:    {results['macro_recall']*100:.2f}%\n")
        f.write(f"Macro F1-Score:  {results['macro_f1']*100:.2f}%\n")
        f.write(f"ECE:             {results['calibration']['ece']:.4f}\n\n")
        
        f.write("STRONGEST CLASS\n")
        f.write("-" * 70 + "\n")
        f.write(f"Class: {class_names[strongest_idx]}\n")
        f.write(f"F1-Score: {f1_scores[strongest_idx]*100:.2f}%\n")
        f.write(f"Precision: {results['per_class_precision'][strongest_idx]*100:.2f}%\n")
        f.write(f"Recall: {results['per_class_recall'][strongest_idx]*100:.2f}%\n")
        f.write(f"Support: {results['per_class_support'][strongest_idx]}\n\n")
        
        f.write("WEAKEST CLASS\n")
        f.write("-" * 70 + "\n")
        f.write(f"Class: {class_names[weakest_idx]}\n")
        f.write(f"F1-Score: {f1_scores[weakest_idx]*100:.2f}%\n")
        f.write(f"Precision: {results['per_class_precision'][weakest_idx]*100:.2f}%\n")
        f.write(f"Recall: {results['per_class_recall'][weakest_idx]*100:.2f}%\n")
        f.write(f"Support: {results['per_class_support'][weakest_idx]}\n\n")
        
        f.write("MOST CONFUSED PAIRS (Top 3)\n")
        f.write("-" * 70 + "\n")
        for idx, (count, true_idx, pred_idx) in enumerate(top_confused, 1):
            f.write(f"{idx}. True: {class_names[true_idx]} -> Predicted: {class_names[pred_idx]}\n")
            f.write(f"   Count: {count} samples\n")
            total_true_samples = cm[true_idx, :].sum()
            if total_true_samples > 0:
                f.write(f"   Percentage: {(count/total_true_samples)*100:.2f}% of {class_names[true_idx]} samples\n")
            f.write("\n")
        
        f.write("=" * 70 + "\n")
    
    print(f"✓ Saved evaluation summary to {output_path}")


def evaluate():
    """Main evaluation function with argparse"""
    parser = argparse.ArgumentParser(description='Evaluate AloeVeraMate disease detection model')
    parser.add_argument('--model_path', type=str, default='./artifacts/model.pt',
                        help='Path to trained model checkpoint')
    parser.add_argument('--dataset_root', type=str, default='../../dataset',
                        help='Path to dataset root')
    parser.add_argument('--split_dir', type=str, default='./splits',
                        help='Directory containing split CSV files')
    parser.add_argument('--output_dir', type=str, default='./artifacts',
                        help='Output directory for evaluation results')
    parser.add_argument('--calibration_path', type=str, default=None,
                        help='Path to calibration.json (optional, for temperature scaling)')
    parser.add_argument('--batch_size', type=int, default=32,
                        help='Batch size')
    parser.add_argument('--num_workers', type=int, default=4,
                        help='Number of data loading workers')
    parser.add_argument('--device', type=str, default='cuda',
                        choices=['cuda', 'cpu'], help='Device to evaluate on')
    
    args = parser.parse_args()
    
    # Convert paths
    model_path = Path(args.model_path).resolve()
    dataset_root = Path(args.dataset_root).resolve()
    split_dir = Path(args.split_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    calibration_path = Path(args.calibration_path).resolve() if args.calibration_path else None
    
    print("=" * 60)
    print("EVALUATING ALOE VERA DISEASE DETECTION MODEL")
    print("=" * 60)
    
    # Setup device
    device = torch.device(args.device if torch.cuda.is_available() else 'cpu')
    print(f"\n📱 Device: {device}")
    
    # Load calibration if available
    temperature = 1.0
    if calibration_path and calibration_path.exists():
        print(f"\n🌡️  Loading calibration from {calibration_path}")
        with open(calibration_path, 'r') as f:
            calibration_config = json.load(f)
            temperature = calibration_config.get('temperature', 1.0)
        print(f"✓ Using temperature scaling: {temperature:.4f}")
    else:
        print(f"\n⚠️  No calibration file found. Using temperature=1.0 (uncalibrated)")
        if calibration_path:
            print(f"   Calibration path does not exist: {calibration_path}")
    
    # Load model
    print(f"\n📦 Loading model from {model_path}")
    checkpoint = torch.load(model_path, map_location=device)
    
    num_classes = checkpoint.get('num_classes', len(CLASS_NAMES))
    class_names = checkpoint.get('class_names', CLASS_NAMES)
    
    model = create_model(num_classes=num_classes, pretrained=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(device)
    
    print(f"✓ Loaded model from epoch {checkpoint['epoch']}")
    print(f"✓ Validation loss: {checkpoint['val_loss']:.4f}")
    print(f"✓ Validation accuracy: {checkpoint['val_acc']*100:.2f}%")
    
    # Load test dataset
    print(f"\n📂 Loading test dataset...")
    test_loader, _ = load_dataset(
        dataset_root=dataset_root,
        split='test',
        split_dir=split_dir,
        batch_size=args.batch_size,
        num_workers=args.num_workers
    )
    print(f"✓ Test batches: {len(test_loader)}")
    
    # Evaluate
    results = evaluate_model(model, test_loader, device, class_names, temperature=temperature)
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Plot confusion matrix
    cm_path = output_dir / 'confusion_matrix.png'
    plot_confusion_matrix(
        results['confusion_matrix'],
        class_names,
        cm_path,
        normalize=True
    )
    
    # Plot per-class metrics
    metrics_path = output_dir / 'per_class_metrics.png'
    plot_per_class_metrics(
        results['per_class_precision'],
        results['per_class_recall'],
        results['per_class_f1'],
        class_names,
        metrics_path
    )
    
    # Plot reliability diagram
    reliability_path = output_dir / 'reliability_diagram.png'
    plot_reliability_diagram(results['calibration'], reliability_path)
    
    # Save per-class metrics CSV
    csv_path = output_dir / 'per_class_metrics.csv'
    save_per_class_csv(
        results['per_class_precision'],
        results['per_class_recall'],
        results['per_class_f1'],
        results['per_class_support'],
        class_names,
        csv_path
    )
    
    # Save results to JSON
    results_json = {
        'accuracy': float(results['accuracy']),
        'macro_precision': float(results['macro_precision']),
        'macro_recall': float(results['macro_recall']),
        'macro_f1': float(results['macro_f1']),
        'weighted_precision': float(results['weighted_precision']),
        'weighted_recall': float(results['weighted_recall']),
        'weighted_f1': float(results['weighted_f1']),
        'calibration_ece': float(results['calibration']['ece']),
        'temperature': float(temperature),
        'per_class_metrics': {
            name: {
                'precision': float(results['per_class_precision'][i]),
                'recall': float(results['per_class_recall'][i]),
                'f1_score': float(results['per_class_f1'][i]),
                'support': int(results['per_class_support'][i])
            }
            for i, name in enumerate(class_names)
        },
        'confusion_matrix': results['confusion_matrix'].tolist()
    }
    
    results_path = output_dir / 'evaluation_results.json'
    with open(results_path, 'w') as f:
        json.dump(results_json, f, indent=2)
    
    print(f"✓ Saved evaluation results to {results_path}")
    
    # Create evaluation summary text file
    summary_path = output_dir / 'eval_summary.txt'
    create_eval_summary_txt(results, class_names, summary_path)
    
    # Print summary
    print_evaluation_summary(results, class_names)
    
    print(f"\n📁 Output files saved to {output_dir}/:")
    print(f"  - confusion_matrix.png")
    print(f"  - per_class_metrics.png")
    print(f"  - per_class_metrics.csv")
    print(f"  - reliability_diagram.png")
    print(f"  - evaluation_results.json")
    print(f"  - eval_summary.txt")
    
    print("\n✅ Evaluation complete!")


if __name__ == '__main__':
    evaluate()
