import logging
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException

from app.database import get_db, utcnow_str
from app.models import (
    ChapterBatchUpdate,
    ChapterCreate,
    ChapterDetectionRequest,
    ChapterMergeRequest,
    ChapterResponse,
    ChapterSplitRequest,
    ChapterUpdate,
    ConversionSettingsModel,
)
from app.services.chapter_detector import (
    detect_chapters,
    merge_chapters,
    split_chapter,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects/{project_id}/chapters", tags=["chapters"])


@router.get("", response_model=List[ChapterResponse])
def get_chapters(project_id: str):
    """Retrieves all chapters for a given project."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_num ASC", (project_id,)
    ).fetchall()
    conn.close()

    return [
        ChapterResponse(
            id=r["id"],
            project_id=r["project_id"],
            chapter_num=r["chapter_num"],
            title=r["title"],
            start_page=r["start_page"],
            end_page=r["end_page"],
            page_count=r["page_count"],
            level=r["level"],
            detection_method=r["detection_method"],
            status=r["status"],
            is_selected=bool(r["is_selected"]),
            markdown_path=r["markdown_path"],
            markdown_size=r["markdown_size"],
            image_count=r["image_count"],
            error_message=r["error_message"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


@router.post("/detect", response_model=List[ChapterResponse])
def detect_project_chapters(project_id: str, payload: ChapterDetectionRequest):
    """
    Intelligently detects chapters using Bookmarks, Printed TOC, Visual Headings, or Heuristics.
    Saves chapters to database and sets project status to 'ready' for user review.
    Does NOT start conversion automatically.
    """
    conn = get_db()
    proj = conn.execute("SELECT filepath, page_count FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    pdf_path = Path(proj["filepath"])
    if not pdf_path.exists():
        conn.close()
        raise HTTPException(status_code=404, detail="PDF file not found on disk")

    try:
        detection_result = detect_chapters(
            filepath=pdf_path,
            method=payload.method,
            max_level=payload.max_level,
            min_pages_per_chapter=payload.min_pages_per_chapter,
            toc_scan_pages=payload.toc_scan_pages,
        )
    except Exception as e:
        conn.close()
        logger.error(f"Detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chapter detection failed: {str(e)}")

    now = utcnow_str()

    with conn:
        # Clear previous chapters
        conn.execute("DELETE FROM chapters WHERE project_id = ?", (project_id,))

        for item in detection_result.chapters:
            ch_id = f"ch_{uuid.uuid4().hex[:10]}"
            conn.execute(
                """
                INSERT INTO chapters (
                    id, project_id, chapter_num, title, start_page, end_page,
                    page_count, level, detection_method, status, is_selected,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)
                """,
                (
                    ch_id,
                    project_id,
                    item["chapter_num"],
                    item["title"],
                    item["start_page"],
                    item["end_page"],
                    item["page_count"],
                    item.get("level", 1),
                    detection_result.method,
                    now,
                    now,
                ),
            )

        # Update project status to 'ready'
        conn.execute("UPDATE projects SET status = 'ready', updated_at = ? WHERE id = ?", (now, project_id))

    # Return refreshed chapters
    rows = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_num ASC", (project_id,)
    ).fetchall()
    conn.close()

    return [
        ChapterResponse(
            id=r["id"],
            project_id=r["project_id"],
            chapter_num=r["chapter_num"],
            title=r["title"],
            start_page=r["start_page"],
            end_page=r["end_page"],
            page_count=r["page_count"],
            level=r["level"],
            detection_method=r["detection_method"],
            status=r["status"],
            is_selected=bool(r["is_selected"]),
            markdown_path=r["markdown_path"],
            markdown_size=r["markdown_size"],
            image_count=r["image_count"],
            error_message=r["error_message"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


@router.post("", response_model=ChapterResponse)
def add_chapter(project_id: str, payload: ChapterCreate):
    """Manually adds a chapter boundary."""
    conn = get_db()
    proj = conn.execute("SELECT page_count FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.start_page < 1 or payload.end_page > proj["page_count"] or payload.start_page > payload.end_page:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Invalid page bounds: start={payload.start_page}, end={payload.end_page}, max={proj['page_count']}",
        )

    ch_id = f"ch_{uuid.uuid4().hex[:10]}"
    now = utcnow_str()
    page_count = payload.end_page - payload.start_page + 1

    with conn:
        conn.execute(
            """
            INSERT INTO chapters (
                id, project_id, chapter_num, title, start_page, end_page,
                page_count, level, detection_method, status, is_selected, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
            """,
            (
                ch_id,
                project_id,
                payload.chapter_num,
                payload.title,
                payload.start_page,
                payload.end_page,
                page_count,
                payload.level,
                payload.detection_method,
                1 if payload.is_selected else 0,
                now,
                now,
            ),
        )
    conn.close()

    return ChapterResponse(
        id=ch_id,
        project_id=project_id,
        chapter_num=payload.chapter_num,
        title=payload.title,
        start_page=payload.start_page,
        end_page=payload.end_page,
        page_count=page_count,
        level=payload.level,
        detection_method=payload.detection_method,
        status="pending",
        is_selected=payload.is_selected,
        created_at=now,
        updated_at=now,
    )


@router.put("/{chapter_id}", response_model=ChapterResponse)
def update_chapter(project_id: str, chapter_id: str, payload: ChapterUpdate):
    """Updates title, page boundaries, or selection state of an individual chapter."""
    conn = get_db()
    ch = conn.execute("SELECT * FROM chapters WHERE id = ? AND project_id = ?", (chapter_id, project_id)).fetchone()
    if not ch:
        conn.close()
        raise HTTPException(status_code=404, detail="Chapter not found")

    new_title = payload.title if payload.title is not None else ch["title"]
    new_start = payload.start_page if payload.start_page is not None else ch["start_page"]
    new_end = payload.end_page if payload.end_page is not None else ch["end_page"]
    new_selected = payload.is_selected if payload.is_selected is not None else bool(ch["is_selected"])
    new_level = payload.level if payload.level is not None else ch["level"]

    if new_start > new_end or new_start < 1:
        conn.close()
        raise HTTPException(status_code=400, detail="start_page must be <= end_page and >= 1")

    now = utcnow_str()
    page_count = new_end - new_start + 1

    with conn:
        conn.execute(
            """
            UPDATE chapters 
            SET title = ?, start_page = ?, end_page = ?, page_count = ?,
                is_selected = ?, level = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_title, new_start, new_end, page_count, 1 if new_selected else 0, new_level, now, chapter_id),
        )

    r = conn.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,)).fetchone()
    conn.close()

    return ChapterResponse(
        id=r["id"],
        project_id=r["project_id"],
        chapter_num=r["chapter_num"],
        title=r["title"],
        start_page=r["start_page"],
        end_page=r["end_page"],
        page_count=r["page_count"],
        level=r["level"],
        detection_method=r["detection_method"],
        status=r["status"],
        is_selected=bool(r["is_selected"]),
        markdown_path=r["markdown_path"],
        markdown_size=r["markdown_size"],
        image_count=r["image_count"],
        error_message=r["error_message"],
        created_at=r["created_at"],
        updated_at=r["updated_at"],
    )


@router.delete("/{chapter_id}")
def delete_chapter(project_id: str, chapter_id: str):
    """Deletes a chapter and re-numbers remaining chapters."""
    conn = get_db()
    with conn:
        conn.execute("DELETE FROM chapters WHERE id = ? AND project_id = ?", (chapter_id, project_id))
        remaining = conn.execute(
            "SELECT id FROM chapters WHERE project_id = ? ORDER BY start_page ASC", (project_id,)
        ).fetchall()
        for idx, row in enumerate(remaining):
            conn.execute("UPDATE chapters SET chapter_num = ? WHERE id = ?", (idx + 1, row["id"]))
    conn.close()
    return {"status": "success", "message": "Chapter deleted."}


@router.post("/split", response_model=List[ChapterResponse])
def split_project_chapter(project_id: str, payload: ChapterSplitRequest, chapter_id: str):
    """Splits a chapter at a given split_page."""
    conn = get_db()
    chapters = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_num ASC", (project_id,)
    ).fetchall()

    ch_list = [dict(c) for c in chapters]
    try:
        updated = split_chapter(
            ch_list,
            chapter_id=chapter_id,
            split_page=payload.split_page,
            first_title=payload.first_title,
            second_title=payload.second_title,
        )
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))

    now = utcnow_str()
    with conn:
        conn.execute("DELETE FROM chapters WHERE project_id = ?", (project_id,))
        for c in updated:
            cid = c.get("id") or f"ch_{uuid.uuid4().hex[:10]}"
            if "_split" in str(cid):
                cid = f"ch_{uuid.uuid4().hex[:10]}"
            conn.execute(
                """
                INSERT INTO chapters (
                    id, project_id, chapter_num, title, start_page, end_page,
                    page_count, level, detection_method, status, is_selected, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)
                """,
                (
                    cid,
                    project_id,
                    c["chapter_num"],
                    c["title"],
                    c["start_page"],
                    c["end_page"],
                    c["page_count"],
                    c.get("level", 1),
                    c.get("detection_method", "manual"),
                    now,
                    now,
                ),
            )
    conn.close()
    return get_chapters(project_id)


@router.post("/{chapter_id}/reconvert", response_model=ChapterResponse)
def reconvert_single_chapter(
    project_id: str,
    chapter_id: str,
    custom_settings: Optional[ConversionSettingsModel] = None,
):
    """
    Selectively reconverts ONLY this single chapter with optional overridden settings
    (e.g. table_format="html", enable_ocr=True, etc.), leaving all other chapters untouched.
    """
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    ch = conn.execute(
        "SELECT * FROM chapters WHERE id = ? AND project_id = ?", (chapter_id, project_id)
    ).fetchone()
    if not ch:
        conn.close()
        raise HTTPException(status_code=404, detail="Chapter not found")

    settings_row = conn.execute(
        "SELECT * FROM conversion_settings WHERE project_id = ?", (project_id,)
    ).fetchone()
    conn.close()

    # Use custom settings if provided, else project defaults
    if custom_settings:
        settings = custom_settings
    elif settings_row:
        settings = ConversionSettingsModel(
            preserve_headings=bool(settings_row["preserve_headings"]),
            preserve_tables=bool(settings_row["preserve_tables"]),
            table_format=settings_row["table_format"],
            extract_images=bool(settings_row["extract_images"]),
            image_format=settings_row["image_format"],
            min_image_dimension=settings_row["min_image_dimension"],
            image_quality=settings_row["image_quality"],
            include_page_numbers=bool(settings_row["include_page_numbers"]),
            remove_repeated_headers=bool(settings_row["remove_repeated_headers"]),
            remove_repeated_footers=bool(settings_row["remove_repeated_footers"]),
            enable_ocr=bool(settings_row["enable_ocr"]),
            ocr_language=settings_row["ocr_language"],
            batch_size=settings_row["batch_size"],
            output_format=settings_row["output_format"],
        )
    else:
        settings = ConversionSettingsModel()

    from app.services.converter import convert_chapter_to_markdown

    pdf_path = Path(proj["filepath"])
    output_dir = Path(proj["output_dir"])

    try:
        res = convert_chapter_to_markdown(
            pdf_path=pdf_path,
            chapter=dict(ch),
            project_output_dir=output_dir,
            settings=settings,
        )
    except Exception as e:
        logger.error(f"Selective reconversion error: {e}")
        raise HTTPException(status_code=500, detail=f"Selective reconversion failed: {str(e)}")

    now = utcnow_str()
    conn = get_db()
    with conn:
        conn.execute(
            """
            UPDATE chapters 
            SET status = 'completed', markdown_path = ?, markdown_size = ?, image_count = ?,
                error_message = NULL, updated_at = ?
            WHERE id = ?
            """,
            (res["filepath"], res["filesize"], res["image_count"], now, chapter_id),
        )
    
    updated_ch = conn.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,)).fetchone()
    conn.close()

    return ChapterResponse(
        id=updated_ch["id"],
        project_id=updated_ch["project_id"],
        chapter_num=updated_ch["chapter_num"],
        title=updated_ch["title"],
        start_page=updated_ch["start_page"],
        end_page=updated_ch["end_page"],
        page_count=updated_ch["page_count"],
        level=updated_ch["level"],
        detection_method=updated_ch["detection_method"],
        status=updated_ch["status"],
        is_selected=bool(updated_ch["is_selected"]),
        markdown_path=updated_ch["markdown_path"],
        markdown_size=updated_ch["markdown_size"],
        image_count=updated_ch["image_count"],
        error_message=updated_ch["error_message"],
        created_at=updated_ch["created_at"],
        updated_at=updated_ch["updated_at"],
    )


@router.post("/reconvert-batch", response_model=List[ChapterResponse])
def reconvert_batch_chapters(
    project_id: str,
    chapter_ids: List[str],
    custom_settings: Optional[ConversionSettingsModel] = None,
):
    """Selectively reconverts a specified list of chapters."""
    results = []
    for cid in chapter_ids:
        res = reconvert_single_chapter(project_id, cid, custom_settings)
        results.append(res)
    return results



@router.post("/merge", response_model=List[ChapterResponse])
def merge_project_chapters(project_id: str, payload: ChapterMergeRequest):
    """Merges two or more selected chapters."""
    conn = get_db()
    chapters = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_num ASC", (project_id,)
    ).fetchall()

    ch_list = [dict(c) for c in chapters]
    try:
        updated = merge_chapters(
            ch_list,
            chapter_ids_to_merge=payload.chapter_ids,
            merged_title=payload.merged_title,
        )
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))

    now = utcnow_str()
    with conn:
        conn.execute("DELETE FROM chapters WHERE project_id = ?", (project_id,))
        for c in updated:
            cid = c.get("id") or f"ch_{uuid.uuid4().hex[:10]}"
            conn.execute(
                """
                INSERT INTO chapters (
                    id, project_id, chapter_num, title, start_page, end_page,
                    page_count, level, detection_method, status, is_selected, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)
                """,
                (
                    cid,
                    project_id,
                    c["chapter_num"],
                    c["title"],
                    c["start_page"],
                    c["end_page"],
                    c["page_count"],
                    c.get("level", 1),
                    c.get("detection_method", "manual"),
                    now,
                    now,
                ),
            )
    conn.close()
    return get_chapters(project_id)


@router.post("/{chapter_id}/reconvert", response_model=ChapterResponse)
def reconvert_single_chapter(
    project_id: str,
    chapter_id: str,
    custom_settings: Optional[ConversionSettingsModel] = None,
):
    """
    Selectively reconverts ONLY this single chapter with optional overridden settings
    (e.g. table_format="html", enable_ocr=True, etc.), leaving all other chapters untouched.
    """
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    ch = conn.execute(
        "SELECT * FROM chapters WHERE id = ? AND project_id = ?", (chapter_id, project_id)
    ).fetchone()
    if not ch:
        conn.close()
        raise HTTPException(status_code=404, detail="Chapter not found")

    settings_row = conn.execute(
        "SELECT * FROM conversion_settings WHERE project_id = ?", (project_id,)
    ).fetchone()
    conn.close()

    # Use custom settings if provided, else project defaults
    if custom_settings:
        settings = custom_settings
    elif settings_row:
        settings = ConversionSettingsModel(
            preserve_headings=bool(settings_row["preserve_headings"]),
            preserve_tables=bool(settings_row["preserve_tables"]),
            table_format=settings_row["table_format"],
            extract_images=bool(settings_row["extract_images"]),
            image_format=settings_row["image_format"],
            min_image_dimension=settings_row["min_image_dimension"],
            image_quality=settings_row["image_quality"],
            include_page_numbers=bool(settings_row["include_page_numbers"]),
            remove_repeated_headers=bool(settings_row["remove_repeated_headers"]),
            remove_repeated_footers=bool(settings_row["remove_repeated_footers"]),
            enable_ocr=bool(settings_row["enable_ocr"]),
            ocr_language=settings_row["ocr_language"],
            batch_size=settings_row["batch_size"],
            output_format=settings_row["output_format"],
        )
    else:
        settings = ConversionSettingsModel()

    from app.services.converter import convert_chapter_to_markdown

    pdf_path = Path(proj["filepath"])
    output_dir = Path(proj["output_dir"])

    try:
        res = convert_chapter_to_markdown(
            pdf_path=pdf_path,
            chapter=dict(ch),
            project_output_dir=output_dir,
            settings=settings,
        )
    except Exception as e:
        logger.error(f"Selective reconversion error: {e}")
        raise HTTPException(status_code=500, detail=f"Selective reconversion failed: {str(e)}")

    now = utcnow_str()
    conn = get_db()
    with conn:
        conn.execute(
            """
            UPDATE chapters 
            SET status = 'completed', markdown_path = ?, markdown_size = ?, image_count = ?,
                error_message = NULL, updated_at = ?
            WHERE id = ?
            """,
            (res["filepath"], res["filesize"], res["image_count"], now, chapter_id),
        )
    
    updated_ch = conn.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,)).fetchone()
    conn.close()

    return ChapterResponse(
        id=updated_ch["id"],
        project_id=updated_ch["project_id"],
        chapter_num=updated_ch["chapter_num"],
        title=updated_ch["title"],
        start_page=updated_ch["start_page"],
        end_page=updated_ch["end_page"],
        page_count=updated_ch["page_count"],
        level=updated_ch["level"],
        detection_method=updated_ch["detection_method"],
        status=updated_ch["status"],
        is_selected=bool(updated_ch["is_selected"]),
        markdown_path=updated_ch["markdown_path"],
        markdown_size=updated_ch["markdown_size"],
        image_count=updated_ch["image_count"],
        error_message=updated_ch["error_message"],
        created_at=updated_ch["created_at"],
        updated_at=updated_ch["updated_at"],
    )


@router.post("/reconvert-batch", response_model=List[ChapterResponse])
def reconvert_batch_chapters(
    project_id: str,
    chapter_ids: List[str],
    custom_settings: Optional[ConversionSettingsModel] = None,
):
    """Selectively reconverts a specified list of chapters."""
    results = []
    for cid in chapter_ids:
        res = reconvert_single_chapter(project_id, cid, custom_settings)
        results.append(res)
    return results

