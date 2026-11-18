@echo off
echo ==========================================================
echo  PDF Book to Markdown Studio - Installer (Windows)
echo ==========================================================

cd /d "%~dp0\.."

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH. Please install Python 3.11+.
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+.
    pause
    exit /b 1
)

echo --> Creating Python virtual environment...
if not exist "venv" (
    python -m venv venv
)

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    pip install -r backend\requirements.txt
) else (
    python -m pip install --upgrade pip
    python -m pip install -r backend\requirements.txt
)

echo --> Installing frontend dependencies...
cd frontend
call npm install
echo --> Building frontend production bundle...
call npm run build
cd ..

if not exist "data\uploads" mkdir data\uploads
if not exist "data\outputs" mkdir data\outputs
if not exist "data\temp" mkdir data\temp

echo ==========================================================
echo [SUCCESS] Installation complete!
echo Run start.bat to launch PDF Book to Markdown Studio.
echo ==========================================================
pause
