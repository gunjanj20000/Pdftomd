#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " PDF Book to Markdown Studio - Automated Installer (Linux)"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 is not installed. Please install Python 3.11+."
    exit 1
fi

PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✓ Found Python $PY_VER"

# 2. Check Node & NPM
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+."
    exit 1
fi
echo "✓ Found Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed."
    exit 1
fi
echo "✓ Found npm $(npm -v)"

# 3. Check Tesseract OCR (Optional)
if command -v tesseract &> /dev/null; then
    echo "✓ Found Tesseract OCR ($(tesseract --version 2>&1 | head -n 1))"
else
    echo "! Tesseract OCR not found. Optional OCR support will be disabled. (Install with: sudo apt-get install -y tesseract-ocr)"
fi

# 4. Set up Python virtual environment
echo ""
echo "--> Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv || python3 -m virtualenv venv || true
fi

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    PIP_BIN="pip"
else
    echo "Virtual environment creation skipped, using user environment."
    PIP_BIN="python3 -m pip"
fi

echo "--> Installing backend dependencies..."
$PIP_BIN install --upgrade pip
$PIP_BIN install -r backend/requirements.txt

# 5. Set up Frontend
echo ""
echo "--> Installing frontend dependencies..."
cd frontend
npm install

echo "--> Building frontend production bundle..."
npm run build
cd "${ROOT_DIR}"

# 6. Ensure runtime directories
mkdir -p data/uploads data/outputs data/temp

# 7. Create Desktop Shortcut
echo ""
echo "--> Creating Desktop shortcut..."
python3 scripts/create_desktop_shortcut.py || true

echo ""
echo "=========================================================="
echo "✓ Installation completed successfully!"
echo "A shortcut has been created on your Desktop: 'PDF to MD Studio'"
echo "To start the application, double-click the Desktop icon or run:"
echo "  ./scripts/start.sh"
echo "=========================================================="
