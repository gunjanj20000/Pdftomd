import os
import shutil
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.config import DATA_DIR, OUTPUTS_DIR, TEMP_DIR, UPLOADS_DIR
from app.database import get_db, utcnow_str
from app.models import (
    ConversionSettingsModel,
    ConversionSettingsResponse,
    SystemStatsResponse,
)
from app.services.ocr_service import get_available_ocr_languages, is_ocr_available

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings", response_model=ConversionSettingsResponse)
def get_settings(project_id: Optional[str] = Query(None)):
    """Retrieves conversion settings for a project or global defaults."""
    conn = get_db()
    target_id = project_id if project_id else "global"
    row = conn.execute(
        "SELECT * FROM conversion_settings WHERE project_id = ?", (target_id,)
    ).fetchone()

    if not row and target_id != "global":
        # Fallback to global
        row = conn.execute(
            "SELECT * FROM conversion_settings WHERE project_id = 'global'"
        ).fetchone()

    if not row:
        # Create global default row
        now = utcnow_str()
        settings_id = f"set_{target_id}"
        with conn:
            conn.execute(
                """
                INSERT INTO conversion_settings (
                    id, project_id, preserve_headings, preserve_tables, table_format,
                    extract_images, image_format, min_image_dimension, image_quality,
                    include_page_numbers, remove_repeated_headers, remove_repeated_footers,
                    enable_ocr, ocr_language, batch_size, output_format, created_at, updated_at
                ) VALUES (?, ?, 1, 1, 'markdown', 1, 'png', 50, 90, 0, 1, 1, 0, 'eng', 5, 'individual', ?, ?)
                """,
                (settings_id, target_id, now, now),
            )
        row = conn.execute(
            "SELECT * FROM conversion_settings WHERE project_id = ?", (target_id,)
        ).fetchone()

    conn.close()

    return ConversionSettingsResponse(
        id=row["id"],
        project_id=row["project_id"],
        preserve_headings=bool(row["preserve_headings"]),
        preserve_tables=bool(row["preserve_tables"]),
        table_format=row["table_format"],
        extract_images=bool(row["extract_images"]),
        image_format=row["image_format"],
        min_image_dimension=row["min_image_dimension"],
        image_quality=row["image_quality"],
        include_page_numbers=bool(row["include_page_numbers"]),
        remove_repeated_headers=bool(row["remove_repeated_headers"]),
        remove_repeated_footers=bool(row["remove_repeated_footers"]),
        enable_ocr=bool(row["enable_ocr"]),
        ocr_language=row["ocr_language"],
        batch_size=row["batch_size"],
        output_format=row["output_format"],
        custom_settings_json=row["custom_settings_json"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.put("/settings", response_model=ConversionSettingsResponse)
def update_settings(payload: ConversionSettingsModel, project_id: Optional[str] = Query(None)):
    """Updates conversion settings for a project or global defaults."""
    conn = get_db()
    target_id = project_id if project_id else "global"
    now = utcnow_str()

    existing = conn.execute(
        "SELECT id FROM conversion_settings WHERE project_id = ?", (target_id,)
    ).fetchone()

    with conn:
        if existing:
            conn.execute(
                """
                UPDATE conversion_settings SET
                    preserve_headings = ?, preserve_tables = ?, table_format = ?,
                    extract_images = ?, image_format = ?, min_image_dimension = ?,
                    image_quality = ?, include_page_numbers = ?, remove_repeated_headers = ?,
                    remove_repeated_footers = ?, enable_ocr = ?, ocr_language = ?,
                    batch_size = ?, output_format = ?, custom_settings_json = ?, updated_at = ?
                WHERE project_id = ?
                """,
                (
                    1 if payload.preserve_headings else 0,
                    1 if payload.preserve_tables else 0,
                    payload.table_format,
                    1 if payload.extract_images else 0,
                    payload.image_format,
                    payload.min_image_dimension,
                    payload.image_quality,
                    1 if payload.include_page_numbers else 0,
                    1 if payload.remove_repeated_headers else 0,
                    1 if payload.remove_repeated_footers else 0,
                    1 if payload.enable_ocr else 0,
                    payload.ocr_language,
                    payload.batch_size,
                    payload.output_format,
                    payload.custom_settings_json,
                    now,
                    target_id,
                ),
            )
            settings_id = existing["id"]
        else:
            settings_id = f"set_{target_id}"
            conn.execute(
                """
                INSERT INTO conversion_settings (
                    id, project_id, preserve_headings, preserve_tables, table_format,
                    extract_images, image_format, min_image_dimension, image_quality,
                    include_page_numbers, remove_repeated_headers, remove_repeated_footers,
                    enable_ocr, ocr_language, batch_size, output_format, custom_settings_json,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    settings_id,
                    target_id,
                    1 if payload.preserve_headings else 0,
                    1 if payload.preserve_tables else 0,
                    payload.table_format,
                    1 if payload.extract_images else 0,
                    payload.image_format,
                    payload.min_image_dimension,
                    payload.image_quality,
                    1 if payload.include_page_numbers else 0,
                    1 if payload.remove_repeated_headers else 0,
                    1 if payload.remove_repeated_footers else 0,
                    1 if payload.enable_ocr else 0,
                    payload.ocr_language,
                    payload.batch_size,
                    payload.output_format,
                    payload.custom_settings_json,
                    now,
                    now,
                ),
            )
    conn.close()

    return ConversionSettingsResponse(
        id=settings_id,
        project_id=target_id,
        preserve_headings=payload.preserve_headings,
        preserve_tables=payload.preserve_tables,
        table_format=payload.table_format,
        extract_images=payload.extract_images,
        image_format=payload.image_format,
        min_image_dimension=payload.min_image_dimension,
        image_quality=payload.image_quality,
        include_page_numbers=payload.include_page_numbers,
        remove_repeated_headers=payload.remove_repeated_headers,
        remove_repeated_footers=payload.remove_repeated_footers,
        enable_ocr=payload.enable_ocr,
        ocr_language=payload.ocr_language,
        batch_size=payload.batch_size,
        output_format=payload.output_format,
        custom_settings_json=payload.custom_settings_json,
        created_at=now,
        updated_at=now,
    )


@router.get("/settings/ocr-info")
def get_ocr_status():
    """Returns whether Tesseract OCR is available and what languages are installed."""
    available = is_ocr_available()
    languages = get_available_ocr_languages() if available else []
    return {
        "ocr_available": available,
        "languages": languages,
        "engine": "Tesseract OCR",
        "description": "Optional OCR engine for scanned and image-only PDF documents.",
    }


@router.get("/stats", response_model=SystemStatsResponse)
def get_system_stats():
    """Returns dashboard summary statistics."""
    conn = get_db()
    total_projects = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
    total_chapters = conn.execute(
        "SELECT COUNT(*) FROM chapters WHERE status = 'completed'"
    ).fetchone()[0]
    active_jobs = conn.execute(
        "SELECT COUNT(*) FROM conversion_jobs WHERE status IN ('queued', 'running')"
    ).fetchone()[0]
    conn.close()

    # Calculate storage size of DATA_DIR
    total_bytes = 0
    if DATA_DIR.exists():
        for root, dirs, files in os.walk(DATA_DIR):
            for f in files:
                fp = Path(root) / f
                if fp.is_file():
                    total_bytes += fp.stat().st_size

    return SystemStatsResponse(
        total_projects=total_projects,
        total_chapters_converted=total_chapters,
        total_storage_bytes=total_bytes,
        active_jobs=active_jobs,
    )


@router.post("/settings/clear-cache")
def clear_temporary_cache():
    """Cleans up data/temp folder."""
    deleted_files = 0
    if TEMP_DIR.exists():
        for item in TEMP_DIR.iterdir():
            try:
                if item.is_file() or item.is_symlink():
                    item.unlink(missing_ok=True)
                    deleted_files += 1
                elif item.is_dir():
                    shutil.rmtree(item, ignore_errors=True)
                    deleted_files += 1
            except Exception as e:
                logger.warning(f"Failed to remove temp file {item}: {e}")

    return {"status": "success", "deleted_items": deleted_files}
