import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = Path(os.getenv("PDFTOMD_DATA_DIR", BASE_DIR / "data"))
UPLOADS_DIR = DATA_DIR / "uploads"
OUTPUTS_DIR = DATA_DIR / "outputs"
TEMP_DIR = DATA_DIR / "temp"
DB_PATH = DATA_DIR / "studio.db"

# Ensure runtime directories exist
for path in (DATA_DIR, UPLOADS_DIR, OUTPUTS_DIR, TEMP_DIR):
    path.mkdir(parents=True, exist_ok=True)

# Configuration Defaults
DEFAULT_HOST = os.getenv("HOST", "0.0.0.0")
DEFAULT_PORT = int(os.getenv("PORT", "8000"))
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", 1024 * 1024 * 1024))  # 1 GB
ALLOWED_EXTENSIONS = {".pdf"}
BATCH_SIZE = int(os.getenv("BATCH_SIZE", 5))
DEFAULT_WORKERS = int(os.getenv("MAX_WORKERS", 2))
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "/usr/bin/tesseract")
