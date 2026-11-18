import pytest
from pathlib import Path
from app.services.pdf_inspector import (
    inspect_pdf,
    render_pdf_page_preview,
    PasswordProtectedError,
    CorruptedPDFError,
)
from tests.sample_generator import (
    create_bookmarked_pdf,
    create_password_pdf,
)


def test_inspect_bookmarked_pdf(tmp_path):
    pdf_path = tmp_path / "bookmarked.pdf"
    create_bookmarked_pdf(pdf_path)

    info = inspect_pdf(pdf_path)
    assert info["page_count"] == 4
    assert info["has_bookmarks"] is True
    assert info["bookmark_count"] == 3
    assert info["is_likely_scanned"] is False
    assert len(info["file_hash"]) == 64


def test_password_protected_pdf(tmp_path):
    pdf_path = tmp_path / "protected.pdf"
    create_password_pdf(pdf_path, "secret123")

    with pytest.raises(PasswordProtectedError):
        inspect_pdf(pdf_path)


def test_corrupted_pdf(tmp_path):
    pdf_path = tmp_path / "corrupt.pdf"
    with open(pdf_path, "wb") as f:
        f.write(b"not a valid pdf binary content")

    with pytest.raises(CorruptedPDFError):
        inspect_pdf(pdf_path)


def test_render_pdf_page_preview(tmp_path):
    pdf_path = tmp_path / "preview_sample.pdf"
    create_bookmarked_pdf(pdf_path)

    png_bytes = render_pdf_page_preview(pdf_path, page_number=1, dpi=72)
    assert len(png_bytes) > 100
    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"
