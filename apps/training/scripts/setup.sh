#!/bin/bash

# Setup script for Unix/Linux/Mac systems
# This script makes all training scripts executable

echo "🔧 Setting up training scripts for Unix/Linux/Mac..."
echo ""

# Navigate to scripts directory
cd "$(dirname "$0")"

# Make all .sh files executable
chmod +x train_stage_a.sh
chmod +x train_stage_b.sh
chmod +x train_all.sh

echo "✅ Made scripts executable:"
echo "   - train_stage_a.sh"
echo "   - train_stage_b.sh"
echo "   - train_all.sh"
echo ""

# Verify permissions
echo "📋 Verifying permissions..."
ls -la *.sh

echo ""
echo "✨ Setup complete! You can now run:"
echo "   ./train_stage_a.sh  - Train Stage A only"
echo "   ./train_stage_b.sh  - Train Stage B only"
echo "   ./train_all.sh      - Train both stages"
echo ""
