import io
import logging
import shutil
from typing import List, Optional
from PIL import Image

logger = logging.getLogger(__name__)

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False


def is_ocr_available() -> bool:
    """Checks if tesseract executable and pytesseract library are available."""
    if not PYTESSERACT_AVAILABLE:
        return False
    return shutil.which("tesseract") is not None


def get_available_ocr_languages() -> List[str]:
    """Returns list of installed Tesseract languages."""
    if not is_ocr_available():
        return []
    try:
        langs = pytesseract.get_languages()
        # Filter out osd
        return [l for l in langs if l != "osd"]
    except Exception as e:
        logger.warning(f"Error fetching tesseract languages: {e}")
        return ["eng"]


def ocr_image(image_bytes: bytes, lang: str = "eng") -> str:
    """Runs Tesseract OCR on raw image bytes."""
    if not is_ocr_available():
        raise RuntimeError("Tesseract OCR is not installed or enabled on this system.")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img, lang=lang)
        return text.strip()
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return ""


def ocr_page_pixmap(pixmap, lang: str = "eng") -> str:
    """Runs OCR directly on a PyMuPDF pixmap."""
    png_bytes = pixmap.tobytes("png")
    return ocr_image(png_bytes, lang=lang)
