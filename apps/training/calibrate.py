"""
Model calibration using temperature scaling

Temperature scaling is a simple post-processing method that learns a single
scalar parameter to scale logits before softmax, improving probability calibration.
"""
import json
from pathlib import Path
from typing import Dict, Tuple, List
import argparse

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from tqdm import tqdm

from data_loader import load_dataset, CLASS_NAMES
from train import create_model


class TemperatureScaling(nn.Module):
    """
    Temperature scaling layer for model calibration
    
    Guo et al., "On Calibration of Modern Neural Networks", ICML 2017
    """
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)  # Initialize at 1.5
    
    def forward(self, logits):
        """Scale logits by temperature before softmax"""
        return logits / self.temperature
    
    def get_temperature(self):
        """Get current temperature value"""
        return self.temperature.item()


def collect_logits_labels(
    model: nn.Module,
    dataloader,
    device: torch.device
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Collect logits and labels from validation set
    
    Returns:
        (logits, labels) as tensors
    """
    model.eval()
    
    all_logits = []
    all_labels = []
    
    print("\n📊 Collecting logits from validation set...")
    with torch.no_grad():
        for inputs, labels in tqdm(dataloader, desc="Collecting"):
            inputs = inputs.to(device)
            labels = labels.to(device)
            
            logits = model(inputs)
            
            all_logits.append(logits.cpu())
            all_labels.append(labels.cpu())
    
    all_logits = torch.cat(all_logits, dim=0)
    all_labels = torch.cat(all_labels, dim=0)
    
    print(f"✓ Collected {len(all_logits)} samples")
    
    return all_logits, all_labels


def fit_temperature_scaling(
    logits: torch.Tensor,
    labels: torch.Tensor,
    device: torch.device,
    max_iter: int = 100,
    lr: float = 0.01
) -> float:
    """
    Fit temperature scaling parameter to minimize NLL
    
    Args:
        logits: Model logits (before softmax)
        labels: True labels
        device: Device to run optimization on
        max_iter: Maximum optimization iterations
        lr: Learning rate
    
    Returns:
        Optimal temperature value
    """
    print("\n🌡️  Fitting temperature scaling...")
    
    logits = logits.to(device)
    labels = labels.to(device)
    
    # Create temperature scaling layer
    temp_scaler = TemperatureScaling().to(device)
    
    # Negative log-likelihood loss
    criterion = nn.CrossEntropyLoss()
    
    # LBFGS optimizer (recommended for temperature scaling)
    optimizer = optim.LBFGS([temp_scaler.temperature], lr=lr, max_iter=max_iter)
    
    # Compute initial NLL
    with torch.no_grad():
        initial_logits = logits
        initial_loss = criterion(initial_logits, labels).item()
        print(f"  Initial NLL: {initial_loss:.4f}")
        print(f"  Initial temperature: {temp_scaler.get_temperature():.4f}")
    
    # Optimize temperature
    def closure():
        optimizer.zero_grad()
        scaled_logits = temp_scaler(logits)
        loss = criterion(scaled_logits, labels)
        loss.backward()
        return loss
    
    optimizer.step(closure)
    
    # Compute final NLL
    with torch.no_grad():
        scaled_logits = temp_scaler(logits)
        final_loss = criterion(scaled_logits, labels).item()
        optimal_temp = temp_scaler.get_temperature()
        
        print(f"  Final NLL: {final_loss:.4f}")
        print(f"  Optimal temperature: {optimal_temp:.4f}")
        print(f"  NLL improvement: {initial_loss - final_loss:.4f}")
    
    return optimal_temp


def evaluate_calibration(
    logits: torch.Tensor,
    labels: torch.Tensor,
    temperature: float
) -> Dict[str, float]:
    """
    Evaluate calibration quality before and after temperature scaling
    
    Returns:
        Dict with accuracy and NLL metrics
    """
    # Before scaling
    probs_before = torch.softmax(logits, dim=1)
    nll_before = nn.CrossEntropyLoss()(logits, labels).item()
    preds_before = probs_before.argmax(dim=1)
    acc_before = (preds_before == labels).float().mean().item()
    
    # After scaling
    scaled_logits = logits / temperature
    probs_after = torch.softmax(scaled_logits, dim=1)
    nll_after = nn.CrossEntropyLoss()(scaled_logits, labels).item()
    preds_after = probs_after.argmax(dim=1)
    acc_after = (preds_after == labels).float().mean().item()
    
    return {
        'before_scaling': {
            'accuracy': acc_before,
            'nll': nll_before
        },
        'after_scaling': {
            'accuracy': acc_after,
            'nll': nll_after,
            'temperature': temperature
        }
    }


def compute_ece(
    probs: torch.Tensor,
    labels: torch.Tensor,
    n_bins: int = 10
) -> Tuple[float, List[float], List[float], List[int]]:
    """
    Compute Expected Calibration Error (ECE)
    
    Args:
        probs: Predicted probabilities (N, num_classes)
        labels: True labels (N,)
        n_bins: Number of bins for calibration curve
    
    Returns:
        (ece, bin_confidences, bin_accuracies, bin_counts)
    """
    max_probs, preds = torch.max(probs, dim=1)
    max_probs = max_probs.cpu().numpy()
    preds = preds.cpu().numpy()
    labels = labels.cpu().numpy()
    
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    bin_confidences = []
    bin_accuracies = []
    bin_counts = []
    
    ece = 0.0
    n_samples = len(labels)
    
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        
        # Find samples in this bin
        in_bin = (max_probs > bin_lower) & (max_probs <= bin_upper)
        bin_count = in_bin.sum()
        
        if bin_count > 0:
            # Average confidence in bin
            bin_confidence = max_probs[in_bin].mean()
            # Average accuracy in bin
            bin_accuracy = (preds[in_bin] == labels[in_bin]).mean()
            
            # ECE contribution: |confidence - accuracy| * proportion of samples
            ece += np.abs(bin_confidence - bin_accuracy) * (bin_count / n_samples)
            
            bin_confidences.append(float(bin_confidence))
            bin_accuracies.append(float(bin_accuracy))
        else:
            bin_confidences.append(0.0)
            bin_accuracies.append(0.0)
        
        bin_counts.append(int(bin_count))
    
    return ece, bin_confidences, bin_accuracies, bin_counts


def compute_confidence_histogram(
    probs: torch.Tensor,
    n_bins: int = 20
) -> Tuple[List[float], List[int]]:
    """
    Compute confidence histogram
    
    Args:
        probs: Predicted probabilities (N, num_classes)
        n_bins: Number of histogram bins
    
    Returns:
        (bin_edges, bin_counts)
    """
    max_probs = torch.max(probs, dim=1)[0].cpu().numpy()
    
    counts, edges = np.histogram(max_probs, bins=n_bins, range=(0, 1))
    
    return edges.tolist(), counts.tolist()


def create_calibration_report(
    logits: torch.Tensor,
    labels: torch.Tensor,
    temperature: float,
    output_path: Path
):
    """
    Create detailed calibration report with ECE and histogram data
    
    Args:
        logits: Model logits
        labels: True labels
        temperature: Calibrated temperature
        output_path: Path to save report
    """
    print("\n📊 Creating calibration report...")
    
    # Before scaling
    probs_before = torch.softmax(logits, dim=1)
    ece_before, bin_conf_before, bin_acc_before, bin_counts_before = compute_ece(
        probs_before, labels, n_bins=10
    )
    hist_edges_before, hist_counts_before = compute_confidence_histogram(
        probs_before, n_bins=20
    )
    
    # After scaling
    scaled_logits = logits / temperature
    probs_after = torch.softmax(scaled_logits, dim=1)
    ece_after, bin_conf_after, bin_acc_after, bin_counts_after = compute_ece(
        probs_after, labels, n_bins=10
    )
    hist_edges_after, hist_counts_after = compute_confidence_histogram(
        probs_after, n_bins=20
    )
    
    report = {
        "expected_calibration_error": {
            "before_scaling": float(ece_before),
            "after_scaling": float(ece_after),
            "improvement": float(ece_before - ece_after)
        },
        "calibration_curve": {
            "before_scaling": {
                "bin_confidences": bin_conf_before,
                "bin_accuracies": bin_acc_before,
                "bin_counts": bin_counts_before,
                "n_bins": 10
            },
            "after_scaling": {
                "bin_confidences": bin_conf_after,
                "bin_accuracies": bin_acc_after,
                "bin_counts": bin_counts_after,
                "n_bins": 10
            }
        },
        "confidence_histogram": {
            "before_scaling": {
                "bin_edges": hist_edges_before,
                "bin_counts": hist_counts_before,
                "n_bins": 20
            },
            "after_scaling": {
                "bin_edges": hist_edges_after,
                "bin_counts": hist_counts_after,
                "n_bins": 20
            }
        },
        "temperature": float(temperature),
        "n_samples": int(len(labels))
    }
    
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"✓ Saved calibration report to {output_path}")
    print(f"\nECE Metrics:")
    print(f"  Before scaling: {ece_before:.4f}")
    print(f"  After scaling:  {ece_after:.4f}")
    print(f"  Improvement:    {ece_before - ece_after:.4f}")


def calibrate_model(
    model_path: Path,
    dataset_root: Path,
    split_dir: Path,
    output_path: Path,
    batch_size: int = 32,
    num_workers: int = 4,
    device: str = 'cuda'
):
    """
    Calibrate model using temperature scaling on validation set
    
    Args:
        model_path: Path to trained model checkpoint
        dataset_root: Path to dataset root
        split_dir: Directory containing split CSV files
        output_path: Path to save calibration.json
        batch_size: Batch size
        num_workers: Number of data loading workers
        device: Device to run on
    """
    print("=" * 60)
    print("MODEL CALIBRATION WITH TEMPERATURE SCALING")
    print("=" * 60)
    
    # Setup device
    device = torch.device(device if torch.cuda.is_available() else 'cpu')
    print(f"\n📱 Device: {device}")
    
    # Load model
    print(f"\n📦 Loading model from {model_path}")
    checkpoint = torch.load(model_path, map_location=device)
    
    num_classes = checkpoint.get('num_classes', len(CLASS_NAMES))
    
    model = create_model(num_classes=num_classes, pretrained=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(device)
    model.eval()
    
    print(f"✓ Loaded model from epoch {checkpoint['epoch']}")
    
    # Load validation dataset
    print(f"\n📂 Loading validation dataset...")
    val_loader, _ = load_dataset(
        dataset_root=dataset_root,
        split='val',
        split_dir=split_dir,
        batch_size=batch_size,
        num_workers=num_workers
    )
    print(f"✓ Validation batches: {len(val_loader)}")
    
    # Collect logits and labels
    logits, labels = collect_logits_labels(model, val_loader, device)
    
    # Fit temperature scaling
    optimal_temp = fit_temperature_scaling(logits, labels, device)
    
    # Evaluate calibration improvement
    print("\n📈 Calibration Quality:")
    print("-" * 60)
    metrics = evaluate_calibration(logits, labels, optimal_temp)
    
    print(f"\nBefore Temperature Scaling:")
    print(f"  Accuracy: {metrics['before_scaling']['accuracy']*100:.2f}%")
    print(f"  NLL: {metrics['before_scaling']['nll']:.4f}")
    
    print(f"\nAfter Temperature Scaling:")
    print(f"  Accuracy: {metrics['after_scaling']['accuracy']*100:.2f}%")
    print(f"  NLL: {metrics['after_scaling']['nll']:.4f}")
    print(f"  Temperature: {metrics['after_scaling']['temperature']:.4f}")
    
    # Save calibration config
    calibration_config = {
        "temperature": float(optimal_temp),
        "thresholds": {
            "HIGH": 0.80,
            "MEDIUM": 0.60
        },
        "metrics": metrics
    }
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(calibration_config, f, indent=2)
    
    print(f"\n✓ Saved calibration config to {output_path}")
    
    # Create detailed calibration report
    report_path = output_path.parent / 'calibration_report.json'
    create_calibration_report(logits, labels, optimal_temp, report_path)
    
    # Summary
    print("\n" + "=" * 60)
    print("CALIBRATION COMPLETE!")
    print("=" * 60)
    print(f"Optimal temperature: {optimal_temp:.4f}")
    print(f"NLL improvement: {metrics['before_scaling']['nll'] - metrics['after_scaling']['nll']:.4f}")
    print(f"\nUsage in inference:")
    print(f"  logits = model(images)")
    print(f"  calibrated_logits = logits / {optimal_temp:.4f}")
    print(f"  probs = softmax(calibrated_logits)")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calibrate model with temperature scaling")
    parser.add_argument('--model_path', type=str, default='./artifacts/model.pt',
                        help='Path to trained model checkpoint')
    parser.add_argument('--dataset_root', type=str, default='../../dataset',
                        help='Path to dataset root')
    parser.add_argument('--split_dir', type=str, default='./splits',
                        help='Directory containing split CSV files')
    parser.add_argument('--output_path', type=str, default='./artifacts/calibration.json',
                        help='Path to save calibration config')
    parser.add_argument('--batch_size', type=int, default=32,
                        help='Batch size')
    parser.add_argument('--num_workers', type=int, default=4,
                        help='Number of data loading workers')
    parser.add_argument('--device', type=str, default='cuda',
                        choices=['cuda', 'cpu'], help='Device to run on')
    
    args = parser.parse_args()
    
    model_path = Path(args.model_path).resolve()
    dataset_root = Path(args.dataset_root).resolve()
    split_dir = Path(args.split_dir).resolve()
    output_path = Path(args.output_path).resolve()
    
    calibrate_model(
        model_path=model_path,
        dataset_root=dataset_root,
        split_dir=split_dir,
        output_path=output_path,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
        device=args.device
    )
