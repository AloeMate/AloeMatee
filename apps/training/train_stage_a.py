"""
Training script for Stage A: Binary classifier (Healthy vs Unhealthy)

This is the first stage of a two-stage inference pipeline that determines
if the plant is healthy or has any disease before running disease-specific classification.
"""
import json
import time
from pathlib import Path
from typing import Dict, Any
import argparse

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import models
from tqdm import tqdm

from data_loader import load_dataset, get_class_weights


# Binary classes: 0=Healthy, 1=Unhealthy (any disease)
BINARY_CLASS_NAMES = ['Healthy', 'Unhealthy']


def create_binary_model(pretrained: bool = True) -> nn.Module:
    """
    Create EfficientNetV2-S model for binary classification
    
    Args:
        pretrained: Use ImageNet pretrained weights
    
    Returns:
        PyTorch model with 2-class output
    """
    # Load pretrained EfficientNetV2-S
    weights = models.EfficientNet_V2_S_Weights.DEFAULT if pretrained else None
    model = models.efficientnet_v2_s(weights=weights)
    
    # Replace classifier head for binary classification
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, 2)
    
    return model


def convert_to_binary_labels(dataset):
    """
    Convert multi-class dataset to binary (healthy=0, unhealthy=1)
    
    Original classes:
    0: Aloe Rot (unhealthy) -> 1
    1: Aloe Rust (unhealthy) -> 1
    2: Anthracnose (unhealthy) -> 1
    3: Healthy -> 0
    4: Leaf Spot (unhealthy) -> 1
    5: Sunburn (unhealthy) -> 1
    """
    # Create mapping: healthy(3) -> 0, all diseases -> 1
    binary_targets = []
    for _, target in dataset:
        if target == 3:  # Healthy class
            binary_targets.append(0)
        else:  # Any disease
            binary_targets.append(1)
    
    # Update dataset targets
    dataset.targets = binary_targets
    
    return dataset


def train_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: torch.device,
    epoch: int
) -> Dict[str, float]:
    """Train for one epoch"""
    model.train()
    
    running_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(dataloader, desc=f"Epoch {epoch} [Train]")
    for inputs, labels in pbar:
        inputs = inputs.to(device)
        labels = labels.to(device)
        
        # Zero gradients
        optimizer.zero_grad()
        
        # Forward pass
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        # Statistics
        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        # Update progress bar
        pbar.set_postfix({
            'loss': f'{loss.item():.4f}',
            'acc': f'{100.*correct/total:.2f}%'
        })
    
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    
    return {
        'loss': epoch_loss,
        'accuracy': epoch_acc
    }


@torch.no_grad()
def validate_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    epoch: int
) -> Dict[str, float]:
    """Validate for one epoch"""
    model.eval()
    
    running_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(dataloader, desc=f"Epoch {epoch} [Val]")
    for inputs, labels in pbar:
        inputs = inputs.to(device)
        labels = labels.to(device)
        
        # Forward pass
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        
        # Statistics
        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        # Update progress bar
        pbar.set_postfix({
            'loss': f'{loss.item():.4f}',
            'acc': f'{100.*correct/total:.2f}%'
        })
    
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    
    return {
        'loss': epoch_loss,
        'accuracy': epoch_acc
    }


def train(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    scheduler: optim.lr_scheduler._LRScheduler,
    device: torch.device,
    num_epochs: int,
    save_dir: Path
) -> Dict[str, Any]:
    """
    Train the binary classification model
    
    Returns:
        Training history with best metrics
    """
    save_dir.mkdir(parents=True, exist_ok=True)
    
    best_val_acc = 0.0
    best_epoch = 0
    history = {
        'train_loss': [],
        'train_acc': [],
        'val_loss': [],
        'val_acc': []
    }
    
    print(f"\n{'='*60}")
    print(f"Training Stage A: Binary Classifier (Healthy vs Unhealthy)")
    print(f"{'='*60}\n")
    
    for epoch in range(1, num_epochs + 1):
        print(f"\nEpoch {epoch}/{num_epochs}")
        print("-" * 40)
        
        # Train
        train_metrics = train_epoch(model, train_loader, criterion, optimizer, device, epoch)
        history['train_loss'].append(train_metrics['loss'])
        history['train_acc'].append(train_metrics['accuracy'])
        
        # Validate
        val_metrics = validate_epoch(model, val_loader, criterion, device, epoch)
        history['val_loss'].append(val_metrics['loss'])
        history['val_acc'].append(val_metrics['accuracy'])
        
        # Learning rate scheduling
        scheduler.step()
        
        # Print epoch summary
        print(f"\nEpoch {epoch} Summary:")
        print(f"  Train Loss: {train_metrics['loss']:.4f} | Train Acc: {train_metrics['accuracy']:.4f}")
        print(f"  Val Loss: {val_metrics['loss']:.4f} | Val Acc: {val_metrics['accuracy']:.4f}")
        print(f"  LR: {optimizer.param_groups[0]['lr']:.6f}")
        
        # Save best model
        if val_metrics['accuracy'] > best_val_acc:
            best_val_acc = val_metrics['accuracy']
            best_epoch = epoch
            torch.save(model.state_dict(), save_dir / 'model.pt')
            print(f"  ✓ Best model saved (Val Acc: {best_val_acc:.4f})")
    
    print(f"\n{'='*60}")
    print(f"Training Complete!")
    print(f"Best Validation Accuracy: {best_val_acc:.4f} (Epoch {best_epoch})")
    print(f"{'='*60}\n")
    
    # Save training history
    history['best_val_acc'] = best_val_acc
    history['best_epoch'] = best_epoch
    history['num_epochs'] = num_epochs
    
    with open(save_dir / 'training_history.json', 'w') as f:
        json.dump(history, f, indent=2)
    
    return history


def main():
    parser = argparse.ArgumentParser(description='Train Stage A Binary Classifier')
    parser.add_argument('--epochs', type=int, default=10, help='Number of epochs')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu')
    args = parser.parse_args()
    
    # Configuration
    device = torch.device(args.device)
    print(f"Using device: {device}")
    
    # Load datasets
    print("\nLoading datasets...")
    train_dataset, val_dataset, _ = load_dataset()
    
    # Convert to binary labels
    print("Converting to binary classification (Healthy vs Unhealthy)...")
    train_dataset = convert_to_binary_labels(train_dataset)
    val_dataset = convert_to_binary_labels(val_dataset)
    
    # Create data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=4,
        pin_memory=True
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=4,
        pin_memory=True
    )
    
    print(f"Train samples: {len(train_dataset)}")
    print(f"Val samples: {len(val_dataset)}")
    
    # Calculate class distribution
    train_targets = train_dataset.targets
    healthy_count = sum(1 for t in train_targets if t == 0)
    unhealthy_count = sum(1 for t in train_targets if t == 1)
    print(f"\nClass distribution (train):")
    print(f"  Healthy: {healthy_count} ({100*healthy_count/len(train_targets):.1f}%)")
    print(f"  Unhealthy: {unhealthy_count} ({100*unhealthy_count/len(train_targets):.1f}%)")
    
    # Create model
    print("\nCreating binary classification model...")
    model = create_binary_model(pretrained=True)
    model = model.to(device)
    
    # Calculate class weights for imbalanced data
    print("\nCalculating class weights...")
    # Simple weight calculation based on inverse frequency
    total = len(train_targets)
    weights = torch.tensor([
        total / (2 * healthy_count),
        total / (2 * unhealthy_count)
    ], dtype=torch.float32).to(device)
    print(f"Class weights: Healthy={weights[0]:.4f}, Unhealthy={weights[1]:.4f}")
    
    # Loss function with class weights
    criterion = nn.CrossEntropyLoss(weight=weights)
    
    # Optimizer
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    
    # Learning rate scheduler
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)
    
    # Output directory
    save_dir = Path('artifacts/stage_a')
    
    # Train
    history = train(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        criterion=criterion,
        optimizer=optimizer,
        scheduler=scheduler,
        device=device,
        num_epochs=args.epochs,
        save_dir=save_dir
    )
    
    print(f"\nModel saved to: {save_dir / 'model.pt'}")
    print(f"Training history saved to: {save_dir / 'training_history.json'}")


if __name__ == '__main__':
    main()
