#!/bin/bash

# AloeVeraMate Setup Script for Unix-based systems (macOS/Linux)

echo "🌿 AloeVeraMate Setup Script"
echo "=============================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.10 or higher."
    exit 1
fi

echo "✅ Python $(python3 --version) found"
echo ""

# Setup Backend
echo "📦 Setting up backend..."
cd apps/server

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Created Python virtual environment"
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
echo "✅ Backend dependencies installed"

# Copy environment file
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
fi

cd ../..

# Setup Mobile App
echo ""
echo "📱 Setting up mobile app..."
cd apps/mobile

# Install dependencies
npm install
echo "✅ Mobile app dependencies installed"

# Copy environment file
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo ""
    echo "⚠️  IMPORTANT: Edit apps/mobile/.env and update EXPO_PUBLIC_API_URL with your computer's IP address"
fi

cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit apps/mobile/.env and set your computer's IP address"
echo "2. Start backend: cd apps/server && source venv/bin/activate && python run.py"
echo "3. Start mobile: cd apps/mobile && npm start"
echo ""
echo "See README.md for detailed instructions."
