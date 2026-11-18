#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo "=========================================================="
echo " Starting PDF Book to Markdown Studio"
echo "=========================================================="

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

export PYTHONPATH="${ROOT_DIR}/backend:${PYTHONPATH}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-8000}"

echo "Backend & Frontend running at: http://localhost:${PORT}"
echo "Press Ctrl+C to stop."

# Automatically open default web browser
(sleep 1.2 && (xdg-open "http://localhost:${PORT}" 2>/dev/null || sensible-browser "http://localhost:${PORT}" 2>/dev/null || true)) &

python3 backend/run.py
