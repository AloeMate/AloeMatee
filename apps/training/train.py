"""
Training script for AloeVeraMate disease detection model

Uses EfficientNetV2-S pretrained on ImageNet for 6-class classification.
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

from data_loader import load_dataset, get_class_weights, CLASS_NAMES


def create_model(num_classes: int, pretrained: bool = True) -> nn.Module:
    """
    Create EfficientNetV2-S model
    
    Args:
        num_classes: Number of output classes
        pretrained: Use ImageNet pretrained weights
    
    Returns:
        PyTorch model
    """
    # Load pretrained EfficientNetV2-S
    weights = models.EfficientNet_V2_S_Weights.DEFAULT if pretrained else None
    model = models.efficientnet_v2_s(weights=weights)
    
    # Replace classifier head for our 6 classes
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, num_classes)
    
    return model


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


def train_model(
    dataset_root: Path,
    split_dir: Path,
    output_dir: Path,
    num_epochs: int = 30,
    batch_size: int = 32,
    learning_rate: float = 1e-4,
    weight_decay: float = 1e-4,
    num_workers: int = 4,
    device: str = 'cuda',
    use_class_weights: bool = True,
    patience: int = 5
) -> None:
    """
    Train EfficientNetV2-S model
    
    Args:
        dataset_root: Path to dataset root
        split_dir: Directory containing split CSV files
        output_dir: Directory to save checkpoints and metrics
        num_epochs: Number of training epochs
        batch_size: Batch size
        learning_rate: Learning rate
        weight_decay: L2 regularization
        num_workers: Number of data loading workers
        device: Device to train on ('cuda' or 'cpu')
        use_class_weights: Use class weights for imbalanced data
        patience: Early stopping patience
    """
    print("=" * 60)
    print("TRAINING ALOE VERA DISEASE DETECTION MODEL")
    print("=" * 60)
    
    # Setup device
    device = torch.device(device if torch.cuda.is_available() else 'cpu')
    print(f"\n📱 Device: {device}")
    if device.type == 'cuda':
        print(f"   GPU: {torch.cuda.get_device_name(0)}")
        print(f"   Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load datasets
    print(f"\n📂 Loading datasets...")
    train_loader, num_classes = load_dataset(
        dataset_root=dataset_root,
        split='train',
        split_dir=split_dir,
        batch_size=batch_size,
        num_workers=num_workers
    )
    
    val_loader, _ = load_dataset(
        dataset_root=dataset_root,
        split='val',
        split_dir=split_dir,
        batch_size=batch_size,
        num_workers=num_workers
    )
    
    print(f"✓ Train batches: {len(train_loader)}")
    print(f"✓ Val batches: {len(val_loader)}")
    
    # Create model
    print(f"\n🏗️  Creating EfficientNetV2-S model...")
    model = create_model(num_classes=num_classes, pretrained=True)
    model = model.to(device)
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"✓ Total parameters: {total_params:,}")
    print(f"✓ Trainable parameters: {trainable_params:,}")
    
    # Loss function with class weights
    if use_class_weights:
        class_weights = get_class_weights(dataset_root, split_dir)
        class_weights = class_weights.to(device)
        print(f"\n⚖️  Using class weights for imbalanced dataset:")
        for i, (name, weight) in enumerate(zip(CLASS_NAMES, class_weights)):
            print(f"   {name:20s} {weight:.2f}")
        criterion = nn.CrossEntropyLoss(weight=class_weights)
    else:
        criterion = nn.CrossEntropyLoss()
    
    # Optimizer
    optimizer = optim.AdamW(
        model.parameters(),
        lr=learning_rate,
        weight_decay=weight_decay
    )
    
    # Learning rate scheduler
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode='min',
        factor=0.5,
        patience=3
    )
    
    # Training loop
    print(f"\n🚀 Starting training for {num_epochs} epochs...")
    print(f"   Batch size: {batch_size}")
    print(f"   Learning rate: {learning_rate}")
    print(f"   Weight decay: {weight_decay}")
    print(f"   Early stopping patience: {patience}")
    
    best_val_loss = float('inf')
    best_val_acc = 0.0
    patience_counter = 0
    history = {
        'train_loss': [],
        'train_acc': [],
        'val_loss': [],
        'val_acc': [],
        'learning_rates': []
    }
    
    start_time = time.time()
    
    for epoch in range(1, num_epochs + 1):
        epoch_start = time.time()
        
        # Train
        train_metrics = train_epoch(
            model, train_loader, criterion, optimizer, device, epoch
        )
        
        # Validate
        val_metrics = validate_epoch(
            model, val_loader, criterion, device, epoch
        )
        
        # Update scheduler
        scheduler.step(val_metrics['loss'])
        
        # Record metrics
        history['train_loss'].append(train_metrics['loss'])
        history['train_acc'].append(train_metrics['accuracy'])
        history['val_loss'].append(val_metrics['loss'])
        history['val_acc'].append(val_metrics['accuracy'])
        history['learning_rates'].append(optimizer.param_groups[0]['lr'])
        
        epoch_time = time.time() - epoch_start
        
        # Print epoch summary
        print(f"\nEpoch {epoch}/{num_epochs} ({epoch_time:.1f}s)")
        print(f"  Train Loss: {train_metrics['loss']:.4f} | Acc: {train_metrics['accuracy']*100:.2f}%")
        print(f"  Val Loss: {val_metrics['loss']:.4f} | Acc: {val_metrics['accuracy']*100:.2f}%")
        print(f"  LR: {optimizer.param_groups[0]['lr']:.6f}")
        
        # Save best model
        if val_metrics['loss'] < best_val_loss:
            best_val_loss = val_metrics['loss']
            best_val_acc = val_metrics['accuracy']
            patience_counter = 0
            
            checkpoint = {
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_metrics['loss'],
                'val_acc': val_metrics['accuracy'],
                'class_names': CLASS_NAMES,
                'num_classes': num_classes
            }
            
            checkpoint_path = output_dir / 'model.pt'
            torch.save(checkpoint, checkpoint_path)
            print(f"  ✓ Saved best model (val_loss: {val_metrics['loss']:.4f})")
        else:
            patience_counter += 1
            print(f"  Patience: {patience_counter}/{patience}")
        
        # Early stopping
        if patience_counter >= patience:
            print(f"\n⏹️  Early stopping triggered after {epoch} epochs")
            break
        
        print("-" * 60)
    
    total_time = time.time() - start_time
    
    # Save training history
    metrics = {
        'history': history,
        'best_val_loss': best_val_loss,
        'best_val_acc': best_val_acc,
        'total_epochs': epoch,
        'total_time_seconds': total_time,
        'hyperparameters': {
            'batch_size': batch_size,
            'learning_rate': learning_rate,
            'weight_decay': weight_decay,
            'num_epochs': num_epochs,
            'patience': patience,
            'use_class_weights': use_class_weights
        }
    }
    
    metrics_path = output_dir / 'metrics.json'
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print(f"\n✓ Saved training metrics to {metrics_path}")
    
    # Final summary
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE!")
    print("=" * 60)
    print(f"Total time: {total_time/60:.1f} minutes")
    print(f"Best val loss: {best_val_loss:.4f}")
    print(f"Best val accuracy: {best_val_acc*100:.2f}%")
    print(f"Model saved to: {output_dir / 'model.pt'}")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train AloeVeraMate disease detection model")
    parser.add_argument('--dataset_root', type=str, default='../../dataset',
                        help='Path to dataset root')
    parser.add_argument('--split_dir', type=str, default='./splits',
                        help='Directory containing split CSV files')
    parser.add_argument('--output_dir', type=str, default='./artifacts',
                        help='Output directory for checkpoints and metrics')
    parser.add_argument('--epochs', type=int, default=30,
                        help='Number of training epochs')
    parser.add_argument('--batch_size', type=int, default=32,
                        help='Batch size')
    parser.add_argument('--lr', type=float, default=1e-4,
                        help='Learning rate')
    parser.add_argument('--weight_decay', type=float, default=1e-4,
                        help='Weight decay')
    parser.add_argument('--num_workers', type=int, default=4,
                        help='Number of data loading workers')
    parser.add_argument('--device', type=str, default='cuda',
                        choices=['cuda', 'cpu'], help='Device to train on')
    parser.add_argument('--no_class_weights', action='store_true',
                        help='Disable class weights')
    parser.add_argument('--patience', type=int, default=5,
                        help='Early stopping patience')
    
    args = parser.parse_args()
    
    dataset_root = Path(args.dataset_root).resolve()
    split_dir = Path(args.split_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    
    train_model(
        dataset_root=dataset_root,
        split_dir=split_dir,
        output_dir=output_dir,
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        weight_decay=args.weight_decay,
        num_workers=args.num_workers,
        device=args.device,
        use_class_weights=not args.no_class_weights,
        patience=args.patience
    )
