"""
Dataset splitting utility

Creates train/val/test splits (80/10/10) with duplicate detection.
Ensures images from the same session don't leak across splits.
"""
import re
from pathlib import Path
from typing import List, Tuple
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split


def extract_session_id(filename: str) -> str:
    """
    Extract session/base ID from filename to group related images
    
    Examples:
        AloeVeraOriginalRot0001_bright_2051.jpg -> AloeVeraOriginalRot0001
        processed_img_Anthracnose001.jpeg -> processed_img_Anthracnose001
        AloeVeraOriginalFresh0001_zoomed_2257.jpg -> AloeVeraOriginalFresh0001
    
    Returns:
        Base filename without augmentation suffix
    """
    # Remove extension
    name = Path(filename).stem
    
    # Pattern 1: AloeVeraOriginal[Class][Number]_[augmentation]_[id]
    match = re.match(r'(AloeVeraOriginal\w+\d+)', name)
    if match:
        return match.group(1)
    
    # Pattern 2: processed_img_[Class][Number]
    match = re.match(r'(processed_img_\w+\d+)', name)
    if match:
        return match.group(1)
    
    # Fallback: use full filename without augmentation
    # Remove common augmentation suffixes
    for suffix in ['_bright', '_noisy', '_zoomed', '_sheared', '_flipped', '_shifted', '_rotated']:
        if suffix in name:
            return name.split(suffix)[0]
    
    return name


def create_splits(
    dataset_root: Path,
    output_dir: Path,
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    test_ratio: float = 0.1,
    random_state: int = 42
) -> None:
    """
    Create stratified train/val/test splits with duplicate detection
    
    Args:
        dataset_root: Path to dataset root
        output_dir: Directory to save split CSV files
        train_ratio: Training set ratio
        val_ratio: Validation set ratio
        test_ratio: Test set ratio
        random_state: Random seed for reproducibility
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6, \
        "Split ratios must sum to 1.0"
    
    print("=" * 60)
    print("CREATING DATASET SPLITS")
    print("=" * 60)
    
    # Load manifest
    manifest_path = dataset_root / "manifest.csv"
    if not manifest_path.exists():
        raise ValueError(f"manifest.csv not found in {dataset_root}")
    
    df = pd.read_csv(manifest_path)
    print(f"\n✓ Loaded {len(df)} images from manifest.csv")
    
    # Extract session IDs to group related images
    print(f"\n📊 Extracting session IDs to prevent data leakage...")
    df['session_id'] = df['image_path'].apply(lambda x: extract_session_id(Path(x).name))
    df['filename'] = df['image_path'].apply(lambda x: Path(x).name)
    
    # Group by session and label
    session_groups = df.groupby(['session_id', 'label']).size().reset_index(name='count')
    print(f"✓ Found {len(session_groups)} unique sessions")
    print(f"✓ Average images per session: {len(df) / len(session_groups):.1f}")
    
    # Show example groupings
    example_sessions = df.groupby('session_id').size().sort_values(ascending=False).head(5)
    print(f"\nExample sessions with multiple images:")
    for session_id, count in example_sessions.items():
        if count > 1:
            print(f"  {session_id}: {count} images")
    
    # Create stratified splits at session level
    print(f"\n🔀 Creating stratified splits...")
    print(f"  Train: {train_ratio*100:.0f}% | Val: {val_ratio*100:.0f}% | Test: {test_ratio*100:.0f}%")
    
    # First split: train vs (val+test)
    train_sessions, temp_sessions = train_test_split(
        session_groups,
        test_size=(val_ratio + test_ratio),
        stratify=session_groups['label'],
        random_state=random_state
    )
    
    # Second split: val vs test
    val_sessions, test_sessions = train_test_split(
        temp_sessions,
        test_size=test_ratio / (val_ratio + test_ratio),
        stratify=temp_sessions['label'],
        random_state=random_state
    )
    
    # Map sessions to images
    train_session_ids = set(train_sessions['session_id'])
    val_session_ids = set(val_sessions['session_id'])
    test_session_ids = set(test_sessions['session_id'])
    
    train_df = df[df['session_id'].isin(train_session_ids)][['image_path', 'label']]
    val_df = df[df['session_id'].isin(val_session_ids)][['image_path', 'label']]
    test_df = df[df['session_id'].isin(test_session_ids)][['image_path', 'label']]
    
    # Verify no leakage
    train_sessions_set = set(train_df['image_path'].apply(lambda x: extract_session_id(Path(x).name)))
    val_sessions_set = set(val_df['image_path'].apply(lambda x: extract_session_id(Path(x).name)))
    test_sessions_set = set(test_df['image_path'].apply(lambda x: extract_session_id(Path(x).name)))
    
    assert len(train_sessions_set & val_sessions_set) == 0, "Train/Val session leak detected!"
    assert len(train_sessions_set & test_sessions_set) == 0, "Train/Test session leak detected!"
    assert len(val_sessions_set & test_sessions_set) == 0, "Val/Test session leak detected!"
    
    print(f"\n✓ Verified no session leakage between splits")
    
    # Save splits
    output_dir.mkdir(parents=True, exist_ok=True)
    
    train_df.to_csv(output_dir / "train.csv", index=False)
    val_df.to_csv(output_dir / "val.csv", index=False)
    test_df.to_csv(output_dir / "test.csv", index=False)
    
    print(f"\n📁 Saved split files to {output_dir}/")
    print(f"  train.csv: {len(train_df)} images")
    print(f"  val.csv: {len(val_df)} images")
    print(f"  test.csv: {len(test_df)} images")
    
    # Class distribution per split
    print(f"\n📊 Class Distribution:")
    print("-" * 60)
    for split_name, split_df in [('Train', train_df), ('Val', val_df), ('Test', test_df)]:
        print(f"\n{split_name} ({len(split_df)} images):")
        class_counts = split_df['label'].value_counts().sort_index()
        for label, count in class_counts.items():
            percentage = (count / len(split_df)) * 100
            print(f"  {label:20s} {count:4d} ({percentage:5.1f}%)")
    
    print("\n" + "=" * 60)
    print("Split creation complete!")
    print("=" * 60)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Create train/val/test splits")
    parser.add_argument(
        "--dataset_root",
        type=str,
        default="../../dataset",
        help="Path to dataset root"
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="./splits",
        help="Directory to save split CSV files"
    )
    parser.add_argument(
        "--train_ratio",
        type=float,
        default=0.8,
        help="Training set ratio"
    )
    parser.add_argument(
        "--val_ratio",
        type=float,
        default=0.1,
        help="Validation set ratio"
    )
    parser.add_argument(
        "--test_ratio",
        type=float,
        default=0.1,
        help="Test set ratio"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed"
    )
    
    args = parser.parse_args()
    
    dataset_root = Path(args.dataset_root).resolve()
    output_dir = Path(args.output_dir).resolve()
    
    create_splits(
        dataset_root=dataset_root,
        output_dir=output_dir,
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio,
        random_state=args.seed
    )
