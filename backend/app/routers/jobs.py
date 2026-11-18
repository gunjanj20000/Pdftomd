import logging
import time
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.database import get_db, utcnow_str
from app.models import ConversionJobResponse, ProcessingLogEntry
from app.services.job_queue import job_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["jobs"])


@router.post("/api/projects/{project_id}/convert", response_model=ConversionJobResponse)
async def start_conversion(project_id: str):
    """Initiates conversion for all selected chapters in the project."""
    conn = get_db()
    proj = conn.execute("SELECT id, title FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    selected_chapters = conn.execute(
        "SELECT id, status FROM chapters WHERE project_id = ? AND is_selected = 1", (project_id,)
    ).fetchall()

    if not selected_chapters:
        conn.close()
        raise HTTPException(status_code=400, detail="No chapters are selected for conversion.")

    # Guard: check if an active job is already executing for this project
    existing = conn.execute(
        """
        SELECT * FROM conversion_jobs 
        WHERE project_id = ? AND status IN ('running', 'queued')
        ORDER BY created_at DESC LIMIT 1
        """,
        (project_id,),
    ).fetchone()

    if existing:
        conn.close()
        return ConversionJobResponse(
            id=existing["id"],
            project_id=existing["project_id"],
            status=existing["status"],
            total_chapters=existing["total_chapters"],
            completed_chapters=existing["completed_chapters"],
            current_chapter_id=existing["current_chapter_id"],
            current_chapter_title=existing["current_chapter_title"],
            current_page=existing["current_page"] or 0,
            progress_percent=existing["progress_percent"] or 0.0,
            current_stage=existing["current_stage"] or "Queued",
            speed_pages_per_sec=existing["speed_pages_per_sec"] or 0.0,
            eta_seconds=existing["eta_seconds"] or 0,
            created_at=existing["created_at"],
            started_at=existing["started_at"],
        )

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    now = utcnow_str()

    with conn:
        conn.execute(
            """
            INSERT INTO conversion_jobs (
                id, project_id, status, total_chapters, completed_chapters,
                progress_percent, current_stage, created_at
            ) VALUES (?, ?, 'queued', ?, 0, 0.0, 'Queued', ?)
            """,
            (job_id, project_id, len(selected_chapters), now),
        )
    conn.close()

    # Start background execution
    await job_manager.start_job(job_id, project_id)

    return ConversionJobResponse(
        id=job_id,
        project_id=project_id,
        status="queued",
        total_chapters=len(selected_chapters),
        completed_chapters=0,
        progress_percent=0.0,
        current_stage="Queued",
        created_at=now,
    )


@router.get("/api/jobs", response_model=List[ConversionJobResponse])
def list_jobs(project_id: Optional[str] = Query(None)):
    """Lists conversion jobs."""
    conn = get_db()
    if project_id:
        rows = conn.execute(
            "SELECT * FROM conversion_jobs WHERE project_id = ? ORDER BY created_at DESC", (project_id,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM conversion_jobs ORDER BY created_at DESC").fetchall()
    conn.close()

    return [
        ConversionJobResponse(
            id=r["id"],
            project_id=r["project_id"],
            status=r["status"],
            total_chapters=r["total_chapters"],
            completed_chapters=r["completed_chapters"],
            current_chapter_id=r["current_chapter_id"],
            current_chapter_title=r["current_chapter_title"],
            current_page=r["current_page"] or 0,
            progress_percent=r["progress_percent"] or 0.0,
            current_stage=r["current_stage"] or "queued",
            speed_pages_per_sec=r["speed_pages_per_sec"] or 0.0,
            eta_seconds=r["eta_seconds"] or 0,
            error_message=r["error_message"],
            created_at=r["created_at"],
            started_at=r["started_at"],
            completed_at=r["completed_at"],
        )
        for r in rows
    ]


@router.get("/api/jobs/{job_id}", response_model=ConversionJobResponse)
def get_job(job_id: str):
    """Retrieves conversion job status and real-time metrics."""
    conn = get_db()
    r = conn.execute("SELECT * FROM conversion_jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()

    if not r:
        raise HTTPException(status_code=404, detail="Job not found")

    return ConversionJobResponse(
        id=r["id"],
        project_id=r["project_id"],
        status=r["status"],
        total_chapters=r["total_chapters"],
        completed_chapters=r["completed_chapters"],
        current_chapter_id=r["current_chapter_id"],
        current_chapter_title=r["current_chapter_title"],
        current_page=r["current_page"] or 0,
        progress_percent=r["progress_percent"] or 0.0,
        current_stage=r["current_stage"] or "queued",
        speed_pages_per_sec=r["speed_pages_per_sec"] or 0.0,
        eta_seconds=r["eta_seconds"] or 0,
        error_message=r["error_message"],
        created_at=r["created_at"],
        started_at=r["started_at"],
        completed_at=r["completed_at"],
    )


@router.post("/api/jobs/{job_id}/pause")
async def pause_job(job_id: str):
    """Pauses an ongoing conversion job."""
    success = await job_manager.pause_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail="Job is not actively running or could not be paused.")
    return {"status": "success", "message": f"Job {job_id} paused."}


@router.post("/api/jobs/{job_id}/resume")
async def resume_job(job_id: str):
    """Resumes a paused conversion job."""
    conn = get_db()
    r = conn.execute("SELECT project_id FROM conversion_jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()

    if not r:
        raise HTTPException(status_code=404, detail="Job not found")

    success = await job_manager.resume_job(job_id, r["project_id"])
    return {"status": "success", "message": f"Job {job_id} resumed."}


@router.post("/api/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancels an ongoing conversion job."""
    success = await job_manager.cancel_job(job_id)
    return {"status": "success", "message": f"Job {job_id} cancelled."}


@router.post("/api/projects/{project_id}/retry/{chapter_id}")
async def retry_chapter(project_id: str, chapter_id: str):
    """Retries conversion for a specific failed chapter."""
    new_job_id = await job_manager.retry_chapter(project_id, chapter_id)
    return {"status": "success", "job_id": new_job_id, "message": f"Retrying chapter {chapter_id}."}


@router.get("/api/jobs/{job_id}/logs", response_model=List[ProcessingLogEntry])
def get_job_logs(job_id: str, limit: int = Query(100)):
    """Retrieves execution logs for a specific job."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM processing_logs WHERE job_id = ? ORDER BY id DESC LIMIT ?",
        (job_id, limit),
    ).fetchall()
    conn.close()

    return [
        ProcessingLogEntry(
            id=r["id"],
            job_id=r["job_id"],
            project_id=r["project_id"],
            chapter_id=r["chapter_id"],
            level=r["level"],
            stage=r["stage"],
            message=r["message"],
            timestamp=r["timestamp"],
        )
        for r in rows
    ]


@router.get("/api/projects/{project_id}/logs", response_model=List[ProcessingLogEntry])
def get_project_logs(project_id: str, limit: int = Query(200)):
    """Retrieves all execution logs for a project."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM processing_logs WHERE project_id = ? ORDER BY id DESC LIMIT ?",
        (project_id, limit),
    ).fetchall()
    conn.close()

    return [
        ProcessingLogEntry(
            id=r["id"],
            job_id=r["job_id"],
            project_id=r["project_id"],
            chapter_id=r["chapter_id"],
            level=r["level"],
            stage=r["stage"],
            message=r["message"],
            timestamp=r["timestamp"],
        )
        for r in rows
    ]
