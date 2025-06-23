#!/bin/bash

echo "🎵 Setting up Spleeter for MADE INFINITE..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.8+ and try again."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment for Spleeter
echo "📦 Creating Python virtual environment..."
python3 -m venv spleeter-env

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source spleeter-env/bin/activate

# Install Spleeter
echo "⬇️  Installing Spleeter..."
pip install spleeter

# Install additional dependencies
echo "⬇️  Installing additional dependencies..."
pip install librosa soundfile

# Test Spleeter installation
echo "🧪 Testing Spleeter installation..."
python -c "import spleeter; print('✅ Spleeter installed successfully!')"

# Create processing directory
mkdir -p temp-processing
mkdir -p stems-output

echo "🎉 Spleeter setup complete!"
echo ""
echo "To use Spleeter manually:"
echo "1. source spleeter-env/bin/activate"
echo "2. spleeter separate -p spleeter:4stems-16kHz audio.mp3"
echo ""
echo "The Node.js server will handle this automatically." 