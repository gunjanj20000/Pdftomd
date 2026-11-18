import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pymupdf

logger = logging.getLogger(__name__)


class PDFInspectionError(Exception):
    pass


class PasswordProtectedError(PDFInspectionError):
    pass


class CorruptedPDFError(PDFInspectionError):
    pass


def compute_file_hash(filepath: Path) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()


def inspect_pdf(filepath: Path) -> Dict[str, Any]:
    """Inspects a PDF file, returning comprehensive metadata, structure, and integrity info."""
    if not filepath.exists():
        raise FileNotFoundError(f"PDF file not found: {filepath}")

    filesize = filepath.stat().st_size
    file_hash = compute_file_hash(filepath)

    try:
        doc = pymupdf.open(str(filepath))
    except Exception as e:
        logger.error(f"Failed to open PDF {filepath}: {e}")
        raise CorruptedPDFError(f"Could not open PDF file. It may be corrupted or not a valid PDF: {e}")

    try:
        # Check password / encryption
        if doc.is_encrypted:
            if doc.needs_pass:
                raise PasswordProtectedError("PDF is password-protected. Please provide an unencrypted PDF or unlock it.")

        page_count = doc.page_count
        if page_count == 0:
            doc.close()
            raise CorruptedPDFError("PDF contains 0 pages.")

        # Metadata
        meta = doc.metadata or {}
        title = meta.get("title", "").strip() or filepath.stem.replace("_", " ").title()
        author = meta.get("author", "").strip() or "Unknown Author"
        subject = meta.get("subject", "").strip()
        keywords = meta.get("keywords", "").strip()
        creator = meta.get("creator", "").strip()
        producer = meta.get("producer", "").strip()

        # Check for bookmarks (TOC)
        toc = doc.get_toc(simple=True) or []
        has_bookmarks = len(toc) > 0
        bookmark_count = len(toc)

        # Inspect first pages for printed TOC and text availability
        has_toc_page = False
        scanned_page_count = 0
        pages_to_check = min(page_count, 25)

        toc_keywords = ["contents", "table of contents", "sommaire", "inhaltsverzeichnis", "índice"]

        for i in range(pages_to_check):
            try:
                page = doc.load_page(i)
                text = page.get_text("text").strip().lower()
                if len(text) < 40 and len(page.get_images()) > 0:
                    scanned_page_count += 1
                if not has_toc_page:
                    for kw in toc_keywords:
                        if kw in text:
                            has_toc_page = True
                            break
            except Exception as e:
                logger.warning(f"Error checking page {i}: {e}")

        is_likely_scanned = scanned_page_count > (pages_to_check * 0.7)

        # Estimated processing requirements
        estimated_seconds = max(5, int(page_count * 0.15))
        estimated_memory_mb = min(1024, max(128, int(page_count * 0.4)))

        result = {
            "title": title,
            "author": author,
            "subject": subject,
            "keywords": keywords,
            "creator": creator,
            "producer": producer,
            "page_count": page_count,
            "filesize": filesize,
            "file_hash": file_hash,
            "has_bookmarks": has_bookmarks,
            "bookmark_count": bookmark_count,
            "has_printed_toc": has_toc_page,
            "is_likely_scanned": is_likely_scanned,
            "estimated_seconds": estimated_seconds,
            "estimated_memory_mb": estimated_memory_mb,
            "format": doc.pdf_version() if hasattr(doc, "pdf_version") else "PDF",
        }
        return result
    finally:
        if doc and not getattr(doc, "is_closed", False):
            doc.close()


def render_pdf_page_preview(filepath: Path, page_number: int, dpi: int = 120, max_dimension: int = 1200) -> bytes:
    """Renders a specific 1-based page number to PNG bytes for UI preview."""
    if not filepath.exists():
        raise FileNotFoundError(f"File not found: {filepath}")

    doc = pymupdf.open(str(filepath))
    try:
        if page_number < 1 or page_number > doc.page_count:
            raise ValueError(f"Page number {page_number} is out of range (1-{doc.page_count})")

        page = doc.load_page(page_number - 1)
        pix = page.get_pixmap(dpi=dpi)
        
        # Convert to PNG bytes
        png_bytes = pix.tobytes("png")
        return png_bytes
    finally:
        if doc and not getattr(doc, "is_closed", False):
            doc.close()
