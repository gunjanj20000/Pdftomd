import json
import logging
import shutil
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile
from fastapi.responses import FileResponse, Response

from app.config import MAX_UPLOAD_SIZE, OUTPUTS_DIR, UPLOADS_DIR
from app.database import get_db, utcnow_str
from app.models import ProjectResponse, ProjectUpdate
from app.services.pdf_inspector import (
    CorruptedPDFError,
    PasswordProtectedError,
    inspect_pdf,
    render_pdf_page_preview,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("/upload", response_model=List[ProjectResponse])
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """Uploads one or more PDF files, inspects metadata, and creates project records."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    created_projects = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400, detail=f"File {file.filename} is not a PDF document."
            )

        project_id = f"proj_{uuid.uuid4().hex[:12]}"
        safe_name = Path(file.filename).name
        target_path = UPLOADS_DIR / f"{project_id}_{safe_name}"

        # Write uploaded file in chunks to limit memory usage
        size = 0
        with open(target_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                size += len(chunk)
                if size > MAX_UPLOAD_SIZE:
                    target_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File {file.filename} exceeds max size limit of {MAX_UPLOAD_SIZE // (1024*1024)} MB.",
                    )
                f.write(chunk)

        # Inspect PDF
        try:
            info = inspect_pdf(target_path)
        except PasswordProtectedError as e:
            target_path.unlink(missing_ok=True)
            raise HTTPException(status_code=422, detail=f"Password Protected PDF: {str(e)}")
        except CorruptedPDFError as e:
            target_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=f"Corrupted or invalid PDF: {str(e)}")
        except Exception as e:
            target_path.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail=f"Error inspecting PDF {file.filename}: {str(e)}")

        # Check for duplicates by file_hash
        conn = get_db()
        existing = conn.execute(
            "SELECT id, title FROM projects WHERE metadata_json LIKE ?",
            (f'%"{info["file_hash"]}"%',),
        ).fetchone()

        if existing:
            # Duplicate detected! We can still register or warn
            logger.info(f"Duplicate file detected matching project {existing['id']}")

        # Output directory for this project
        output_dir = OUTPUTS_DIR / project_id
        output_dir.mkdir(parents=True, exist_ok=True)

        now = utcnow_str()
        meta_json = json.dumps(info)

        with conn:
            conn.execute(
                """
                INSERT INTO projects (
                    id, title, author, filename, filepath, filesize, page_count,
                    is_encrypted, has_bookmarks, has_toc, status, output_dir, metadata_json,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?, ?, ?)
                """,
                (
                    project_id,
                    info["title"],
                    info["author"],
                    safe_name,
                    str(target_path),
                    size,
                    info["page_count"],
                    0,
                    1 if info["has_bookmarks"] else 0,
                    1 if info["has_printed_toc"] else 0,
                    str(output_dir),
                    meta_json,
                    now,
                    now,
                ),
            )
            # Create default conversion settings for project
            settings_id = f"set_{project_id}"
            conn.execute(
                """
                INSERT INTO conversion_settings (
                    id, project_id, preserve_headings, preserve_tables, table_format,
                    extract_images, image_format, min_image_dimension, image_quality,
                    include_page_numbers, remove_repeated_headers, remove_repeated_footers,
                    enable_ocr, ocr_language, batch_size, output_format, created_at, updated_at
                ) VALUES (?, ?, 1, 1, 'markdown', 1, 'png', 50, 90, 0, 1, 1, 0, 'eng', 5, 'individual', ?, ?)
                """,
                (settings_id, project_id, now, now),
            )
        conn.close()

        created_projects.append(
            ProjectResponse(
                id=project_id,
                title=info["title"],
                author=info["author"],
                filename=safe_name,
                filepath=str(target_path),
                filesize=size,
                page_count=info["page_count"],
                is_encrypted=False,
                has_bookmarks=info["has_bookmarks"],
                has_toc=info["has_printed_toc"],
                status="uploaded",
                output_dir=str(output_dir),
                metadata_json=meta_json,
                created_at=now,
                updated_at=now,
            )
        )

    return created_projects


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """Lists all projects with optional search and status filter."""
    conn = get_db()
    query = "SELECT * FROM projects WHERE 1=1"
    params = []

    if search:
        query += " AND (title LIKE ? OR author LIKE ? OR filename LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard])

    if status:
        query += " AND status = ?"
        params.append(status)

    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [
        ProjectResponse(
            id=r["id"],
            title=r["title"],
            author=r["author"],
            filename=r["filename"],
            filepath=r["filepath"],
            filesize=r["filesize"],
            page_count=r["page_count"],
            is_encrypted=bool(r["is_encrypted"]),
            has_bookmarks=bool(r["has_bookmarks"]),
            has_toc=bool(r["has_toc"]),
            status=r["status"],
            output_dir=r["output_dir"],
            metadata_json=r["metadata_json"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    """Retrieves single project details."""
    conn = get_db()
    r = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()

    if not r:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        id=r["id"],
        title=r["title"],
        author=r["author"],
        filename=r["filename"],
        filepath=r["filepath"],
        filesize=r["filesize"],
        page_count=r["page_count"],
        is_encrypted=bool(r["is_encrypted"]),
        has_bookmarks=bool(r["has_bookmarks"]),
        has_toc=bool(r["has_toc"]),
        status=r["status"],
        output_dir=r["output_dir"],
        metadata_json=r["metadata_json"],
        created_at=r["created_at"],
        updated_at=r["updated_at"],
    )


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectUpdate):
    """Updates project metadata like title and author."""
    conn = get_db()
    now = utcnow_str()
    updates = []
    params = []

    if payload.title is not None:
        updates.append("title = ?")
        params.append(payload.title)
    if payload.author is not None:
        updates.append("author = ?")
        params.append(payload.author)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(project_id)
        with conn:
            conn.execute(
                f"UPDATE projects SET {', '.join(updates)} WHERE id = ?",
                params,
            )

    r = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()

    if not r:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        id=r["id"],
        title=r["title"],
        author=r["author"],
        filename=r["filename"],
        filepath=r["filepath"],
        filesize=r["filesize"],
        page_count=r["page_count"],
        is_encrypted=bool(r["is_encrypted"]),
        has_bookmarks=bool(r["has_bookmarks"]),
        has_toc=bool(r["has_toc"]),
        status=r["status"],
        output_dir=r["output_dir"],
        metadata_json=r["metadata_json"],
        created_at=r["created_at"],
        updated_at=r["updated_at"],
    )


@router.delete("/{project_id}")
def delete_project(project_id: str):
    """Deletes project, its uploaded PDF, output files, chapters, and database records."""
    conn = get_db()
    r = conn.execute("SELECT filepath, output_dir FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not r:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    filepath = Path(r["filepath"])
    output_dir = Path(r["output_dir"]) if r["output_dir"] else None

    # Delete physical files
    if filepath.exists():
        filepath.unlink(missing_ok=True)
    if output_dir and output_dir.exists():
        shutil.rmtree(output_dir, ignore_errors=True)

    with conn:
        conn.execute("DELETE FROM processing_logs WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM conversion_jobs WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM chapters WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM conversion_settings WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.close()

    return {"status": "success", "message": f"Project {project_id} deleted."}


@router.post("/{project_id}/duplicate", response_model=ProjectResponse)
def duplicate_project(project_id: str):
    """Duplicates a project configuration."""
    conn = get_db()
    r = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not r:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    new_id = f"proj_{uuid.uuid4().hex[:12]}"
    now = utcnow_str()
    new_title = f"{r['title']} (Copy)"
    new_out = OUTPUTS_DIR / new_id
    new_out.mkdir(parents=True, exist_ok=True)

    with conn:
        conn.execute(
            """
            INSERT INTO projects (
                id, title, author, filename, filepath, filesize, page_count,
                is_encrypted, has_bookmarks, has_toc, status, output_dir, metadata_json,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?, ?)
            """,
            (
                new_id,
                new_title,
                r["author"],
                r["filename"],
                r["filepath"],
                r["filesize"],
                r["page_count"],
                r["is_encrypted"],
                r["has_bookmarks"],
                r["has_toc"],
                str(new_out),
                r["metadata_json"],
                now,
                now,
            ),
        )

        # Duplicate chapters
        chapters = conn.execute("SELECT * FROM chapters WHERE project_id = ?", (project_id,)).fetchall()
        for ch in chapters:
            ch_id = f"ch_{uuid.uuid4().hex[:10]}"
            conn.execute(
                """
                INSERT INTO chapters (
                    id, project_id, chapter_num, title, start_page, end_page,
                    page_count, level, detection_method, status, is_selected, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
                """,
                (
                    ch_id,
                    new_id,
                    ch["chapter_num"],
                    ch["title"],
                    ch["start_page"],
                    ch["end_page"],
                    ch["page_count"],
                    ch["level"],
                    ch["detection_method"],
                    ch["is_selected"],
                    now,
                    now,
                ),
            )
    conn.close()

    return ProjectResponse(
        id=new_id,
        title=new_title,
        author=r["author"],
        filename=r["filename"],
        filepath=r["filepath"],
        filesize=r["filesize"],
        page_count=r["page_count"],
        is_encrypted=bool(r["is_encrypted"]),
        has_bookmarks=bool(r["has_bookmarks"]),
        has_toc=bool(r["has_toc"]),
        status="ready",
        output_dir=str(new_out),
        metadata_json=r["metadata_json"],
        created_at=now,
        updated_at=now,
    )


@router.get("/{project_id}/preview-page/{page_number}")
def preview_page(project_id: str, page_number: int, dpi: int = 120):
    """Renders a PDF page as PNG for in-app preview."""
    conn = get_db()
    r = conn.execute("SELECT filepath FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()

    if not r:
        raise HTTPException(status_code=404, detail="Project not found")

    filepath = Path(r["filepath"])
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="PDF file not found on disk")

    try:
        png_bytes = render_pdf_page_preview(filepath, page_number=page_number, dpi=dpi)
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to render page {page_number}: {str(e)}")


@router.get("/{project_id}/quality-audit")
def get_quality_audit(project_id: str):
    """
    Runs automated quality validation diagnostics:
    - Checks for empty content or suspiciously short chapters (< 50 words)
    - Verifies all image markdown links against filesystem
    - Validates table pipe structures and column counts
    - Checks for corrupted unicode or replacement characters
    - Returns document health score (0-100%) and chapter-by-chapter issues
    """
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    chapters = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_num ASC", (project_id,)
    ).fetchall()
    conn.close()

    from app.services.quality_auditor import audit_project_document
    report = audit_project_document(dict(proj), [dict(c) for c in chapters])
    return report

