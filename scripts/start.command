#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=========================================================="
echo " Starting PDF Book to Markdown Studio (macOS)"
echo "=========================================================="

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

export PYTHONPATH="${DIR}/backend:${PYTHONPATH}"
export HOST="127.0.0.1"
export PORT="8000"

# Open default browser
sleep 1 && open "http://localhost:8000" &

python3 backend/run.py
