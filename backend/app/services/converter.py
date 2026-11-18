import os
import re
import shutil
import logging
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from PIL import Image
import pymupdf
import pymupdf4llm

from app.models import ConversionSettingsModel
from app.services.ocr_service import is_ocr_available, ocr_page_pixmap

logger = logging.getLogger(__name__)


def sanitize_filename(name: str) -> str:
    """Sanitizes chapter title for filesystem filename."""
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    clean = re.sub(r"\s+", "_", clean).strip("_.")
    return clean[:80] or "chapter"


def convert_chapter_to_markdown(
    pdf_path: Path,
    chapter: Dict[str, Any],
    project_output_dir: Path,
    settings: Optional[ConversionSettingsModel] = None,
    progress_callback: Optional[Callable[[str, int, str], None]] = None,
    should_abort: Optional[Callable[[], bool]] = None,
) -> Dict[str, Any]:
    """
    Converts a single chapter's page range from a PDF into Markdown using PyMuPDF4LLM.
    Uses chunked page extraction for smooth progress telemetry and low memory footprint.
    Writes output markdown to project_output_dir/chapters/ and images to project_output_dir/images/.
    """
    if settings is None:
        settings = ConversionSettingsModel()

    start_page = int(chapter["start_page"])
    end_page = int(chapter["end_page"])
    chapter_num = int(chapter["chapter_num"])
    title = chapter["title"]

    if progress_callback:
        progress_callback("Reading PDF", start_page, f"Opening PDF for chapter {chapter_num}: {title}")

    # Prepare directories
    chapters_dir = project_output_dir / "chapters"
    images_dir = project_output_dir / "images"
    chapters_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)

    # Also create chapters/images symlink or relative path so both ../images and images work
    ch_img_link = chapters_dir / "images"
    if not ch_img_link.exists():
        try:
            ch_img_link.symlink_to("../images", target_is_directory=True)
        except Exception:
            pass

    # Open PDF
    doc = pymupdf.open(str(pdf_path))
    total_doc_pages = doc.page_count
    
    # Validate page range
    start_idx = max(0, start_page - 1)
    end_idx = min(total_doc_pages - 1, end_page - 1)
    pages_to_convert = list(range(start_idx, end_idx + 1))
    total_chapter_pages = len(pages_to_convert)

    if not pages_to_convert:
        doc.close()
        raise ValueError(f"Invalid page range {start_page}-{end_page} for doc with {total_doc_pages} pages")

    if progress_callback:
        progress_callback(
            "Analyzing pages",
            start_page,
            f"Converting {total_chapter_pages} pages (p. {start_page} to {end_page})",
        )

    # PyMuPDF4LLM options
    write_images = bool(settings.extract_images)
    table_format = "html" if settings.table_format == "html" else "markdown"
    use_ocr = bool(settings.enable_ocr)

    # Chunked page processing: 1 page if OCR is active, up to 3 pages for fast digital text extraction
    chunk_size = 1 if use_ocr else max(1, min(settings.batch_size or 2, 3))
    raw_md_chunks: List[str] = []

    # Execute chunked PyMuPDF4LLM conversion
    try:
        for chunk_offset in range(0, total_chapter_pages, chunk_size):
            if should_abort and should_abort():
                raise InterruptedError(f"Conversion of Chapter {chapter_num} cancelled by user.")

            chunk_page_indices = pages_to_convert[chunk_offset : chunk_offset + chunk_size]
            first_p = chunk_page_indices[0] + 1
            last_p = chunk_page_indices[-1] + 1
            done_in_ch = min(chunk_offset + len(chunk_page_indices), total_chapter_pages)

            if progress_callback:
                p_label = f"p. {first_p}" if first_p == last_p else f"pp. {first_p}–{last_p}"
                progress_callback(
                    "Extracting text",
                    first_p,
                    f"Converting {p_label} of {end_page} ({done_in_ch}/{total_chapter_pages} pages in Ch. {chapter_num})...",
                )

            try:
                chunk_md = pymupdf4llm.to_markdown(
                    doc,
                    pages=chunk_page_indices,
                    write_images=write_images,
                    image_path=str(images_dir) if write_images else "",
                    image_format=settings.image_format,
                    table_output=table_format,
                    page_separators=settings.include_page_numbers,
                    header=not settings.remove_repeated_headers,
                    footer=not settings.remove_repeated_footers,
                    use_ocr=use_ocr,
                )
                if chunk_md:
                    raw_md_chunks.append(chunk_md)
            except Exception as chunk_err:
                logger.warning(
                    f"PyMuPDF4LLM chunk error on pages {chunk_page_indices}: {chunk_err}. Falling back to standard extraction for chunk."
                )
                fallback_chunk_md = _fallback_chapter_to_markdown(
                    doc, chunk_page_indices, images_dir if write_images else None
                )
                if fallback_chunk_md:
                    raw_md_chunks.append(fallback_chunk_md)

        raw_md = "\n\n".join(chunk.strip() for chunk in raw_md_chunks if chunk.strip())
        if not raw_md:
            raw_md = _fallback_chapter_to_markdown(doc, pages_to_convert, images_dir if write_images else None)

    except InterruptedError:
        raise
    except Exception as e:
        logger.warning(f"PyMuPDF4LLM layout conversion failed with: {e}. Falling back to standard extraction.")
        raw_md = _fallback_chapter_to_markdown(doc, pages_to_convert, images_dir if write_images else None)
    finally:
        doc.close()

    if progress_callback:
        progress_callback("Extracting images", start_page, "Inspecting and filtering extracted images...")

    # Filter out tiny decorative icons or images smaller than min_image_dimension
    filtered_images = set()
    if write_images and images_dir.exists():
        min_dim = settings.min_image_dimension
        for img_file in images_dir.glob(f"*.{settings.image_format}"):
            try:
                with Image.open(img_file) as im:
                    w, h = im.size
                    if w < min_dim or h < min_dim:
                        img_file.unlink(missing_ok=True)
                    else:
                        filtered_images.add(img_file.name)
            except Exception as e:
                logger.warning(f"Error checking image {img_file}: {e}")

    if progress_callback:
        progress_callback("Formatting Markdown", start_page, "Cleaning up markdown formatting and image paths...")

    # Clean up and normalize Markdown
    formatted_md = _post_process_markdown(
        raw_md=raw_md,
        chapter_title=title,
        chapter_num=chapter_num,
        start_page=start_page,
        images_dir=images_dir,
        valid_images=filtered_images,
        include_page_numbers=settings.include_page_numbers,
    )

    if progress_callback:
        progress_callback("Saving chapter", end_page, "Writing markdown file to disk...")

    # Save to disk
    safe_title = sanitize_filename(title)
    filename = f"{chapter_num:03d}_{safe_title}.md"
    chapter_file_path = chapters_dir / filename

    with open(chapter_file_path, "w", encoding="utf-8") as f:
        f.write(formatted_md)

    file_size = chapter_file_path.stat().st_size

    if progress_callback:
        progress_callback("Validating output", end_page, f"Chapter {chapter_num} converted successfully.")

    return {
        "chapter_num": chapter_num,
        "title": title,
        "filename": filename,
        "filepath": str(chapter_file_path),
        "filesize": file_size,
        "image_count": len(filtered_images),
        "page_count": len(pages_to_convert),
    }


def _post_process_markdown(
    raw_md: str,
    chapter_title: str,
    chapter_num: int,
    start_page: int,
    images_dir: Path,
    valid_images: set,
    include_page_numbers: bool,
) -> str:
    """Cleans up raw markdown from PyMuPDF4LLM, fixes image paths, and standardizes title."""
    lines = raw_md.split("\n")
    cleaned_lines = []

    # Regular expressions for markdown image tags: ![alt](path)
    img_regex = re.compile(r"!\[(.*?)\]\((.*?)\)")

    def fix_image_tag(match):
        alt = match.group(1)
        raw_path = match.group(2)
        # Extract filename
        fname = Path(raw_path).name
        # If image was filtered out (deleted), omit tag
        if fname not in valid_images:
            return ""
        # Format relative link
        return f"![{alt}](images/{fname})"

    for line in lines:
        # Normalize image paths
        line = img_regex.sub(fix_image_tag, line)
        cleaned_lines.append(line)

    text = "\n".join(cleaned_lines).strip()

    # Ensure document starts with a top-level chapter heading
    first_heading_match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    if not first_heading_match or first_heading_match.start() > 100:
        header = f"# Chapter {chapter_num}: {chapter_title}\n\n"
        text = header + text

    return text + "\n"


def _fallback_chapter_to_markdown(
    doc: pymupdf.Document,
    page_indices: List[int],
    images_dir: Optional[Path] = None,
) -> str:
    """Fallback plain-text extractor when PyMuPDF4LLM layout parser fails."""
    chunks = []
    for idx in page_indices:
        page = doc.load_page(idx)
        text = page.get_text("text").strip()
        chunks.append(text)
    return "\n\n".join(chunks)
