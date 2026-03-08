"""
Unified training script for two-stage inference pipeline

Trains both Stage A (binary) and Stage B (disease-only) models in sequence.
"""
import subprocess
import sys
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n{'='*70}")
    print(f"{description}")
    print(f"{'='*70}\n")
    print(f"Running: {' '.join(cmd)}\n")
    
    result = subprocess.run(cmd, check=False)
    
    if result.returncode != 0:
        print(f"\n❌ Error: {description} failed with exit code {result.returncode}")
        sys.exit(result.returncode)
    
    print(f"\n✅ {description} completed successfully")
    return result


def main():
    """Train both stage models"""
    print(f"\n{'#'*70}")
    print(f"# Two-Stage Model Training Pipeline")
    print(f"{'#'*70}\n")
    
    # Stage A: Binary classifier
    run_command(
        [sys.executable, 'train_stage_a.py', '--epochs', '10', '--batch_size', '32'],
        "Stage A: Binary Classifier (Healthy vs Unhealthy)"
    )
    
    # Stage B: Disease classifier
    run_command(
        [sys.executable, 'train_stage_b.py', '--epochs', '10', '--batch_size', '32'],
        "Stage B: Disease Classifier (5 disease classes)"
    )
    
    print(f"\n{'#'*70}")
    print(f"# Training Complete!")
    print(f"{'#'*70}\n")
    print("Next steps:")
    print("1. Run calibrate_stage_a.py to calibrate Stage A model")
    print("2. Run calibrate_stage_b.py to calibrate Stage B model")
    print("3. Run export_two_stage.py to export both models for production")
    print()


if __name__ == '__main__':
    main()
