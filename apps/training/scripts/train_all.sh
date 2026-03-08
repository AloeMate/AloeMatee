#!/bin/bash
# Train both Stage A and Stage B, then copy to server

set -e  # Exit on error

echo "=========================================="
echo "Training Two-Stage Pipeline"
echo "=========================================="

cd "$(dirname "$0")/.."

# Train Stage A
echo ""
echo "🔷 Training Stage A..."
./scripts/train_stage_a.sh

# Train Stage B
echo ""
echo "🔶 Training Stage B..."
./scripts/train_stage_b.sh

# Copy to server
echo ""
echo "📦 Copying artifacts to server..."

SERVER_DIR="../server/data/models"
mkdir -p "$SERVER_DIR/stage_a"
mkdir -p "$SERVER_DIR/stage_b"

# Copy Stage A
echo "  Copying stage_a artifacts..."
cp artifacts/stage_a/model.pt "$SERVER_DIR/stage_a/"
cp artifacts/stage_a/model_metadata.json "$SERVER_DIR/stage_a/"
cp artifacts/stage_a/calibration.json "$SERVER_DIR/stage_a/" 2>/dev/null || true

# Copy Stage B
echo "  Copying stage_b artifacts..."
cp artifacts/stage_b/model.pt "$SERVER_DIR/stage_b/"
cp artifacts/stage_b/model_metadata.json "$SERVER_DIR/stage_b/"
cp artifacts/stage_b/calibration.json "$SERVER_DIR/stage_b/" 2>/dev/null || true

echo ""
echo "=========================================="
echo "✅ Two-Stage Training Complete!"
echo "=========================================="
echo "Stage A artifacts: $SERVER_DIR/stage_a/"
echo "Stage B artifacts: $SERVER_DIR/stage_b/"
echo ""
echo "Next steps:"
echo "  1. Review training metrics in artifacts/"
echo "  2. Test the server with the new models"
echo "  3. Deploy to production"
echo ""
