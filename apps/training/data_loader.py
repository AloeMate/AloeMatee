"""
Data loader utilities for AloeVeraMate training

Automatically detects dataset format:
- Folder-per-class (ImageFolder)
- CSV manifest (manifest.csv)
"""
import os
from pathlib import Path
from typing import Tuple, Optional, List
import pandas as pd
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.datasets import ImageFolder

# Class names (must match dataset structure)
CLASS_NAMES = [
    "Aloe Rot",
    "Aloe Rust",
    "Anthracnose",
    "Healthy",
    "Leaf Spot",
    "Sunburn"
]


def get_transforms(mode='train', input_size=384):
    """
    Get data transforms for training/validation
    
    Args:
        mode: 'train' or 'val'
        input_size: Input image size for EfficientNetV2-S
    
    Returns:
        torchvision.transforms.Compose
    """
    if mode == 'train':
        return transforms.Compose([
            transforms.RandomResizedCrop(input_size, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
    else:  # val/test
        return transforms.Compose([
            transforms.Resize(input_size + 32),  # Slightly larger
            transforms.CenterCrop(input_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])


class ManifestDataset(Dataset):
    """Dataset loader from CSV manifest"""
    
    def __init__(self, csv_path: str, dataset_root: Path, transform=None):
        self.dataset_root = dataset_root
        self.transform = transform
        
        # Load manifest
        self.df = pd.read_csv(csv_path)
        
        # Create class to index mapping
        unique_labels = sorted(self.df['label'].unique())
        self.class_to_idx = {label: idx for idx, label in enumerate(unique_labels)}
        self.classes = unique_labels
        
        print(f"Loaded {len(self.df)} images from {csv_path}")
        print(f"Classes: {self.classes}")
    
    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = self.dataset_root / row['image_path']
        label = self.class_to_idx[row['label']]
        
        # Load image
        image = Image.open(img_path).convert('RGB')
        
        if self.transform:
            image = self.transform(image)
        
        return image, label


def detect_dataset_format(dataset_root: Path) -> str:
    """
    Detect dataset format
    
    Returns:
        'manifest' if manifest.csv exists, otherwise 'folder'
    """
    manifest_path = dataset_root / 'manifest.csv'
    if manifest_path.exists():
        print(f"✓ Found manifest.csv - using CSV dataset loader")
        return 'manifest'
    
    # Check for folder-per-class structure
    dataset_dir = dataset_root / "Aloe Vera Leaf Disease Detection Dataset"
    if dataset_dir.exists() and dataset_dir.is_dir():
        subdirs = [d for d in dataset_dir.iterdir() if d.is_dir()]
        if len(subdirs) >= 6:
            print(f"✓ Found folder-per-class structure - using ImageFolder")
            return 'folder'
    
    raise ValueError(
        f"Could not detect dataset format in {dataset_root}. "
        f"Expected either manifest.csv or folder-per-class structure."
    )


def load_dataset(
    dataset_root: Path,
    split: str = 'train',
    split_dir: Optional[Path] = None,
    batch_size: int = 32,
    num_workers: int = 4,
    input_size: int = 384
) -> Tuple[DataLoader, int]:
    """
    Load dataset with automatic format detection
    
    Args:
        dataset_root: Path to dataset root
        split: 'train', 'val', or 'test'
        split_dir: Directory containing split CSV files (if using splits)
        batch_size: Batch size
        num_workers: Number of worker processes
        input_size: Input image size
    
    Returns:
        (dataloader, num_classes)
    """
    # Get transforms
    transform = get_transforms(mode=split if split == 'train' else 'val', 
                               input_size=input_size)
    
    # Check for split files
    if split_dir and split_dir.exists():
        split_csv = split_dir / f"{split}.csv"
        if split_csv.exists():
            print(f"Loading {split} split from {split_csv}")
            dataset = ManifestDataset(split_csv, dataset_root, transform=transform)
            num_classes = len(dataset.classes)
        else:
            raise ValueError(f"Split file not found: {split_csv}")
    else:
        # Detect dataset format
        format_type = detect_dataset_format(dataset_root)
        
        if format_type == 'manifest':
            manifest_path = dataset_root / 'manifest.csv'
            dataset = ManifestDataset(manifest_path, dataset_root, transform=transform)
            num_classes = len(dataset.classes)
        else:  # folder
            dataset_dir = dataset_root / "Aloe Vera Leaf Disease Detection Dataset"
            dataset = ImageFolder(dataset_dir, transform=transform)
            num_classes = len(dataset.classes)
            print(f"Loaded {len(dataset)} images from ImageFolder")
            print(f"Classes: {dataset.classes}")
    
    # Create dataloader
    dataloader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=(split == 'train'),
        num_workers=num_workers,
        pin_memory=True,
        drop_last=(split == 'train')  # Drop last incomplete batch for training
    )
    
    return dataloader, num_classes


def get_class_weights(dataset_root: Path, split_dir: Optional[Path] = None) -> torch.Tensor:
    """
    Calculate class weights for imbalanced dataset
    
    Returns:
        Tensor of class weights
    """
    # Load training data to calculate weights
    if split_dir and (split_dir / "train.csv").exists():
        df = pd.read_csv(split_dir / "train.csv")
        label_counts = df['label'].value_counts().sort_index()
    elif (dataset_root / "manifest.csv").exists():
        df = pd.read_csv(dataset_root / "manifest.csv")
        label_counts = df['label'].value_counts().sort_index()
    else:
        dataset_dir = dataset_root / "Aloe Vera Leaf Disease Detection Dataset"
        dataset = ImageFolder(dataset_dir)
        labels = [label for _, label in dataset.samples]
        label_counts = pd.Series(labels).value_counts().sort_index()
    
    # Calculate inverse frequency weights
    total = label_counts.sum()
    weights = total / (len(label_counts) * label_counts)
    
    return torch.tensor(weights.values, dtype=torch.float32)
