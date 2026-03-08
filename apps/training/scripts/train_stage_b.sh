#!/bin/bash
# Train Stage B: Disease Classifier (5 diseases only)

set -e  # Exit on error

echo "=========================================="
echo "Training Stage B: Disease Classifier"
echo "=========================================="

cd "$(dirname "$0")/.."

# Step 1: Train
echo ""
echo "Step 1/4: Training model..."
python train_stage_b.py --epochs 20 --batch_size 32 --lr 0.001

# Step 2: Evaluate
echo ""
echo "Step 2/4: Evaluating model..."
python eval_stage_b.py

# Step 3: Calibrate
echo ""
echo "Step 3/4: Calibrating probabilities..."
python calibrate_stage_b.py

# Step 4: Export
echo ""
echo "Step 4/4: Exporting artifacts..."
python export_stage_b.py

echo ""
echo "=========================================="
echo "✅ Stage B Training Complete!"
echo "=========================================="
echo "Artifacts saved to: artifacts/stage_b/"
echo "  - model.pt"
echo "  - model_metadata.json"
echo "  - training_history.json"
echo "  - calibration.json"
echo "  - confusion_matrix.png"
echo "  - eval_summary.txt"
echo ""
