"""
Model calibration for Stage A: Binary Classifier (Healthy vs Unhealthy)
"""
import json
from pathlib import Path
import argparse

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from tqdm import tqdm

from data_loader import load_dataset
from train_stage_a import create_stage_a_model, STAGE_A_CLASS_NAMES

ARTIFACTS_DIR = Path("artifacts/stage_a")


class TemperatureScaling(nn.Module):
    """Temperature scaling layer for calibration"""
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)
    
    def forward(self, logits):
        return logits / self.temperature
    
    def get_temperature(self):
        return self.temperature.item()


def collect_logits_labels(model, dataloader, device):
    """Collect logits and labels from validation set"""
    model.eval()
    
    all_logits = []
    all_labels = []
    
    print("\nCollecting logits from validation set...")
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


def fit_temperature_scaling(logits, labels, device, max_iter=100, lr=0.01):
    """Fit temperature scaling parameter"""
    print("\nFitting temperature scaling...")
    
    logits = logits.to(device)
    labels = labels.to(device)
    
    temp_scaler = TemperatureScaling().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.LBFGS([temp_scaler.temperature], lr=lr, max_iter=max_iter)
    
    with torch.no_grad():
        initial_loss = criterion(logits, labels).item()
        print(f"  Initial NLL: {initial_loss:.4f}")
        print(f"  Initial temperature: {temp_scaler.get_temperature():.4f}")
    
    def closure():
        optimizer.zero_grad()
        scaled_logits = temp_scaler(logits)
        loss = criterion(scaled_logits, labels)
        loss.backward()
        return loss
    
    optimizer.step(closure)
    
    with torch.no_grad():
        scaled_logits = temp_scaler(logits)
        final_loss = criterion(scaled_logits, labels).item()
        optimal_temp = temp_scaler.get_temperature()
        
        print(f"  Final NLL: {final_loss:.4f}")
        print(f"  Optimal temperature: {optimal_temp:.4f}")
        print(f"  NLL improvement: {initial_loss - final_loss:.4f}")
    
    return optimal_temp


def compute_ece(probs, preds, labels, n_bins=10):
    """Compute Expected Calibration Error"""
    max_probs = np.max(probs, axis=1)
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    
    ece = 0.0
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        
        in_bin = (max_probs > bin_lower) & (max_probs <= bin_upper)
        prop_in_bin = np.mean(in_bin)
        
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(labels[in_bin] == preds[in_bin])
            avg_confidence_in_bin = np.mean(max_probs[in_bin])
            ece += np.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin
    
    return ece


def evaluate_calibration(logits, labels, temperature):
    """Evaluate calibration quality"""
    # Before scaling
    probs_before = torch.softmax(logits, dim=1).numpy()
    preds_before = np.argmax(probs_before, axis=1)
    ece_before = compute_ece(probs_before, preds_before, labels.numpy())
    
    # After scaling
    scaled_logits = logits / temperature
    probs_after = torch.softmax(scaled_logits, dim=1).numpy()
    preds_after = np.argmax(probs_after, axis=1)
    ece_after = compute_ece(probs_after, preds_after, labels.numpy())
    
    # Accuracy
    accuracy_before = np.mean(preds_before == labels.numpy())
    accuracy_after = np.mean(preds_after == labels.numpy())
    
    return {
        'accuracy_before': float(accuracy_before),
        'accuracy_after': float(accuracy_after),
        'ece_before': float(ece_before),
        'ece_after': float(ece_after),
        'ece_improvement': float(ece_before - ece_after)
    }


def calibrate_stage_a(model_path: str):
    """Calibrate Stage A model"""
    
    print("Loading validation dataset...")
    _, val_loader, _ = load_dataset(batch_size=32, stage='A')
    
    print("Loading model...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = create_stage_a_model().to(device)
    
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    
    # Collect logits and labels
    logits, labels = collect_logits_labels(model, val_loader, device)
    
    # Fit temperature scaling
    optimal_temp = fit_temperature_scaling(logits, labels, device)
    
    # Evaluate calibration
    metrics = evaluate_calibration(logits, labels, optimal_temp)
    
    print("\nCalibration Results:")
    print(f"  Before: Accuracy={metrics['accuracy_before']:.4f}, ECE={metrics['ece_before']:.4f}")
    print(f"  After:  Accuracy={metrics['accuracy_after']:.4f}, ECE={metrics['ece_after']:.4f}")
    print(f"  ECE improvement: {metrics['ece_improvement']:.4f}")
    
    # Save calibration config
    calib_config = {
        'temperature': float(optimal_temp),
        'num_classes': 2,
        'class_names': STAGE_A_CLASS_NAMES,
        'stage': 'A',
        'metrics': metrics
    }
    
    output_path = ARTIFACTS_DIR / "calibration.json"
    with open(output_path, 'w') as f:
        json.dump(calib_config, f, indent=2)
    
    print(f"\n✓ Calibration config saved to: {output_path}")
    
    return calib_config


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calibrate Stage A model")
    parser.add_argument('--model_path', type=str,
                       default=str(ARTIFACTS_DIR / "model.pt"),
                       help='Path to model checkpoint')
    
    args = parser.parse_args()
    
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    calibrate_stage_a(args.model_path)
