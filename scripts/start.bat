@echo off
echo ==========================================================
echo  Starting PDF Book to Markdown Studio (Windows)
echo ==========================================================

cd /d "%~dp0\.."

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

set PYTHONPATH=%CD%\backend;%PYTHONPATH%
set HOST=127.0.0.1
set PORT=8000

echo Studio running at http://localhost:8000
start http://localhost:8000

python backend\run.py
pause
