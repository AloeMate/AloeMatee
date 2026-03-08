#!/bin/bash
# Train Stage A: Binary Classifier (Healthy vs Unhealthy)

set -e  # Exit on error

echo "=========================================="
echo "Training Stage A: Binary Classifier"
echo "=========================================="

cd "$(dirname "$0")/.."

# Step 1: Train
echo ""
echo "Step 1/4: Training model..."
python train_stage_a.py --epochs 20 --batch_size 32 --lr 0.001

# Step 2: Evaluate
echo ""
echo "Step 2/4: Evaluating model..."
python eval_stage_a.py

# Step 3: Calibrate
echo ""
echo "Step 3/4: Calibrating probabilities..."
python calibrate_stage_a.py

# Step 4: Export
echo ""
echo "Step 4/4: Exporting artifacts..."
python export_stage_a.py

echo ""
echo "=========================================="
echo "✅ Stage A Training Complete!"
echo "=========================================="
echo "Artifacts saved to: artifacts/stage_a/"
echo "  - model.pt"
echo "  - model_metadata.json"
echo "  - training_history.json"
echo "  - calibration.json"
echo "  - confusion_matrix.png"
echo "  - eval_summary.txt"
echo ""
