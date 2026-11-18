#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=========================================================="
echo " PDF Book to Markdown Studio - Installer (macOS)"
echo "=========================================================="

if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found. Please install Python 3.11+ via python.org or Homebrew."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "ERROR: node not found. Please install Node.js via nodejs.org or Homebrew."
    exit 1
fi

echo "--> Setting up virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "--> Building frontend..."
cd frontend
npm install
npm run build
cd "$DIR"

mkdir -p data/uploads data/outputs data/temp

echo "--> Creating Desktop shortcut..."
python3 scripts/create_desktop_shortcut.py || true

echo "=========================================================="
echo "✓ Installation complete!"
echo "A shortcut 'PDF to MD Studio' has been placed on your Desktop."
echo "Double-click the desktop shortcut or run start.command to launch."
echo "=========================================================="
