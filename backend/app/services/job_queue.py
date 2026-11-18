import asyncio
import logging
import threading
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set

from app.database import get_db, utcnow_str
from app.models import ConversionSettingsModel
from app.services.converter import convert_chapter_to_markdown

logger = logging.getLogger(__name__)


class JobQueueManager:
    def __init__(self):
        # Active in-memory job threads: job_id -> threading.Thread
        self.active_threads: Dict[str, threading.Thread] = {}
        # Pause flags: job_id -> bool
        self.pause_flags: Dict[str, bool] = {}
        # Cancel flags: job_id -> bool
        self.cancel_flags: Dict[str, bool] = {}
        # Active WebSocket subscribers
        self.subscribers: Set[Callable[[Dict[str, Any]], Any]] = set()
        # Reference to the main asyncio loop for websocket notifications
        self.main_loop: Optional[asyncio.AbstractEventLoop] = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self.main_loop = loop

    def subscribe(self, callback: Callable[[Dict[str, Any]], Any]):
        self.subscribers.add(callback)

    def unsubscribe(self, callback: Callable[[Dict[str, Any]], Any]):
        self.subscribers.discard(callback)

    def broadcast_sync(self, event_type: str, data: Dict[str, Any]):
        """Dispatches event to WebSocket subscribers safely from any thread."""
        message = {"event": event_type, "data": data, "timestamp": utcnow_str()}
        for sub in list(self.subscribers):
            try:
                res = sub(message)
                if asyncio.iscoroutine(res):
                    if self.main_loop and self.main_loop.is_running():
                        asyncio.run_coroutine_threadsafe(res, self.main_loop)
                    else:
                        try:
                            loop = asyncio.get_running_loop()
                            asyncio.create_task(res)
                        except RuntimeError:
                            pass
            except Exception as e:
                logger.warning(f"Error notifying subscriber: {e}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        self.broadcast_sync(event_type, data)

    def log(
        self,
        job_id: str,
        project_id: str,
        message: str,
        level: str = "INFO",
        stage: str = "general",
        chapter_id: Optional[str] = None,
    ):
        ts = utcnow_str()
        conn = get_db()
        with conn:
            conn.execute(
                """
                INSERT INTO processing_logs (job_id, project_id, chapter_id, level, stage, message, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (job_id, project_id, chapter_id, level, stage, message, ts),
            )
        conn.close()

        self.broadcast_sync(
            "log",
            {
                "job_id": job_id,
                "project_id": project_id,
                "chapter_id": chapter_id,
                "level": level,
                "stage": stage,
                "message": message,
                "timestamp": ts,
            },
        )

    async def start_job(self, job_id: str, project_id: str) -> None:
        """Starts or resumes a conversion job in a dedicated background worker thread."""
        self.start_job_sync(job_id, project_id)

    def start_job_sync(self, job_id: str, project_id: str) -> None:
        # Try to capture current event loop for broadcasting
        try:
            self.main_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

        # Check if already running
        existing = self.active_threads.get(job_id)
        if existing and existing.is_alive():
            logger.warning(f"Job {job_id} is already running.")
            return

        self.pause_flags[job_id] = False
        self.cancel_flags[job_id] = False

        thread = threading.Thread(
            target=self._run_job_sync,
            args=(job_id, project_id),
            name=f"Worker-{job_id}",
            daemon=True,
        )
        self.active_threads[job_id] = thread
        thread.start()

    async def pause_job(self, job_id: str) -> bool:
        self.pause_flags[job_id] = True
        conn = get_db()
        with conn:
            conn.execute(
                "UPDATE conversion_jobs SET status = 'paused' WHERE id = ?", (job_id,)
            )
        conn.close()
        self.broadcast_sync("job_paused", {"job_id": job_id})
        return True

    async def resume_job(self, job_id: str, project_id: str) -> bool:
        self.pause_flags[job_id] = False
        conn = get_db()
        with conn:
            conn.execute(
                "UPDATE conversion_jobs SET status = 'running' WHERE id = ?", (job_id,)
            )
        conn.close()
        self.start_job_sync(job_id, project_id)
        self.broadcast_sync("job_resumed", {"job_id": job_id})
        return True

    async def cancel_job(self, job_id: str) -> bool:
        self.cancel_flags[job_id] = True
        conn = get_db()
        with conn:
            conn.execute(
                "UPDATE conversion_jobs SET status = 'cancelled' WHERE id = ?", (job_id,)
            )
            conn.execute(
                "UPDATE projects SET status = 'ready' WHERE id = (SELECT project_id FROM conversion_jobs WHERE id = ?)",
                (job_id,),
            )
        conn.close()
        self.broadcast_sync("job_cancelled", {"job_id": job_id})
        return True

    async def retry_chapter(self, project_id: str, chapter_id: str) -> str:
        """Resets a failed chapter to pending and triggers a conversion job."""
        conn = get_db()
        with conn:
            conn.execute(
                "UPDATE chapters SET status = 'pending', error_message = NULL WHERE id = ? AND project_id = ?",
                (chapter_id, project_id),
            )
        conn.close()
        # Find or create a job
        job_id = f"job_{project_id}_{int(time.time())}"
        conn = get_db()
        with conn:
            conn.execute(
                """
                INSERT INTO conversion_jobs (id, project_id, status, total_chapters, completed_chapters, created_at)
                VALUES (?, ?, 'queued', 1, 0, ?)
                """,
                (job_id, project_id, utcnow_str()),
            )
        conn.close()
        self.start_job_sync(job_id, project_id)
        return job_id

    def _run_job_sync(self, job_id: str, project_id: str):
        logger.info(f"Starting execution of job {job_id} for project {project_id}")
        start_time = time.time()
        total_pages_processed = 0

        # Load project and settings
        conn = get_db()
        project = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not project:
            logger.error(f"Project {project_id} not found.")
            return

        settings_row = conn.execute(
            "SELECT * FROM conversion_settings WHERE project_id = ?", (project_id,)
        ).fetchone()
        conn.close()

        settings = ConversionSettingsModel(
            preserve_headings=bool(settings_row["preserve_headings"] if settings_row else True),
            preserve_tables=bool(settings_row["preserve_tables"] if settings_row else True),
            table_format=settings_row["table_format"] if settings_row else "markdown",
            extract_images=bool(settings_row["extract_images"] if settings_row else True),
            image_format=settings_row["image_format"] if settings_row else "png",
            min_image_dimension=settings_row["min_image_dimension"] if settings_row else 50,
            image_quality=settings_row["image_quality"] if settings_row else 90,
            include_page_numbers=bool(settings_row["include_page_numbers"] if settings_row else False),
            remove_repeated_headers=bool(settings_row["remove_repeated_headers"] if settings_row else True),
            remove_repeated_footers=bool(settings_row["remove_repeated_footers"] if settings_row else True),
            enable_ocr=bool(settings_row["enable_ocr"] if settings_row else False),
            ocr_language=settings_row["ocr_language"] if settings_row else "eng",
            batch_size=settings_row["batch_size"] if settings_row else 5,
            output_format=settings_row["output_format"] if settings_row else "individual",
        )

        pdf_path = Path(project["filepath"])
        output_dir = Path(project["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)

        # Mark job and project as running
        conn = get_db()
        with conn:
            conn.execute(
                "UPDATE conversion_jobs SET status = 'running', started_at = ? WHERE id = ?",
                (utcnow_str(), job_id),
            )
            conn.execute("UPDATE projects SET status = 'converting' WHERE id = ?", (project_id,))
        conn.close()

        self.log(job_id, project_id, f"Conversion job initiated for book: {project['title']}")

        try:
            # Query selected chapters
            conn = get_db()
            chapters = conn.execute(
                """
                SELECT * FROM chapters 
                WHERE project_id = ? AND is_selected = 1
                ORDER BY chapter_num ASC
                """,
                (project_id,),
            ).fetchall()
            conn.close()

            total_selected = len(chapters)
            # Count already completed chapters and pages (for resuming!)
            completed_count = sum(1 for c in chapters if c["status"] == "completed")
            total_pages_all_selected = sum(max(1, (c["end_page"] - c["start_page"] + 1)) for c in chapters)
            completed_pages_total = sum(
                max(1, (c["end_page"] - c["start_page"] + 1))
                for c in chapters
                if c["status"] == "completed" and c["markdown_path"] and Path(c["markdown_path"]).exists()
            )

            conn = get_db()
            with conn:
                conn.execute(
                    "UPDATE conversion_jobs SET total_chapters = ?, completed_chapters = ? WHERE id = ?",
                    (total_selected, completed_count, job_id),
                )
            conn.close()

            for ch in chapters:
                # Check pause flag
                if self.pause_flags.get(job_id):
                    self.log(job_id, project_id, "Job paused by user.", level="WARNING")
                    return

                # Check cancel flag
                if self.cancel_flags.get(job_id):
                    self.log(job_id, project_id, "Job cancelled by user.", level="WARNING")
                    return

                chapter_id = ch["id"]
                ch_num = ch["chapter_num"]
                ch_title = ch["title"]
                start_p = ch["start_page"]
                end_p = ch["end_page"]
                pages_in_ch = end_p - start_p + 1

                # If chapter is already completed, skip converting again!
                if ch["status"] == "completed" and ch["markdown_path"] and Path(ch["markdown_path"]).exists():
                    self.log(
                        job_id,
                        project_id,
                        f"Chapter {ch_num} ({ch_title}) already completed, skipping.",
                        chapter_id=chapter_id,
                    )
                    continue

                # Mark chapter converting
                conn = get_db()
                with conn:
                    conn.execute(
                        "UPDATE chapters SET status = 'converting' WHERE id = ?", (chapter_id,)
                    )
                    conn.execute(
                        """
                        UPDATE conversion_jobs 
                        SET current_chapter_id = ?, current_chapter_title = ?, current_stage = 'Reading PDF', current_page = ?
                        WHERE id = ?
                        """,
                        (chapter_id, ch_title, start_p, job_id),
                    )
                conn.close()

                # Chapter start broadcast
                self.broadcast_sync(
                    "job_progress",
                    {
                        "job_id": job_id,
                        "project_id": project_id,
                        "chapter_id": chapter_id,
                        "current_chapter_title": ch_title,
                        "current_page": start_p,
                        "current_stage": "Reading PDF",
                        "speed_pages_per_sec": 0.0,
                        "progress_percent": round((completed_pages_total / max(1, total_pages_all_selected)) * 100, 1),
                        "eta_seconds": 0,
                        "completed_chapters": completed_count,
                        "total_chapters": total_selected,
                    },
                )

                # Progress callback
                def on_progress(stage: str, page_num: int, msg: str):
                    pages_done_in_ch = max(0, page_num - start_p + 1)
                    current_total_done_pages = min(
                        total_pages_all_selected,
                        completed_pages_total + pages_done_in_ch
                    )
                    elapsed = max(0.1, time.time() - start_time)
                    speed = round(current_total_done_pages / elapsed, 1)
                    percent = round((current_total_done_pages / max(1, total_pages_all_selected)) * 100, 1)
                    rem_pages = max(0, total_pages_all_selected - current_total_done_pages)
                    eta = int(rem_pages / max(0.1, speed)) if speed > 0 else 0

                    conn = get_db()
                    with conn:
                        conn.execute(
                            """
                            UPDATE conversion_jobs 
                            SET current_stage = ?, current_page = ?, speed_pages_per_sec = ?, progress_percent = ?, eta_seconds = ?
                            WHERE id = ?
                            """,
                            (stage, page_num, speed, percent, eta, job_id),
                        )
                    conn.close()

                    # Broadcast real-time job_progress for the UI progress cards and speedometers
                    self.broadcast_sync(
                        "job_progress",
                        {
                            "job_id": job_id,
                            "project_id": project_id,
                            "chapter_id": chapter_id,
                            "current_chapter_title": ch_title,
                            "current_page": page_num,
                            "current_stage": stage,
                            "speed_pages_per_sec": speed,
                            "progress_percent": percent,
                            "eta_seconds": eta,
                            "completed_chapters": completed_count,
                            "total_chapters": total_selected,
                        },
                    )

                    self.log(job_id, project_id, msg, stage=stage, chapter_id=chapter_id)

                try:
                    # Execute synchronous PyMuPDF4LLM conversion on worker thread
                    result = convert_chapter_to_markdown(
                        pdf_path=pdf_path,
                        chapter=dict(ch),
                        project_output_dir=output_dir,
                        settings=settings,
                        progress_callback=on_progress,
                        should_abort=lambda: bool(self.cancel_flags.get(job_id) or self.pause_flags.get(job_id)),
                    )

                    completed_count += 1
                    completed_pages_total += pages_in_ch

                    # Update chapter row
                    conn = get_db()
                    with conn:
                        conn.execute(
                            """
                            UPDATE chapters 
                            SET status = 'completed', markdown_path = ?, markdown_size = ?, image_count = ?, updated_at = ?
                            WHERE id = ?
                            """,
                            (
                                result["filepath"],
                                result["filesize"],
                                result["image_count"],
                                utcnow_str(),
                                chapter_id,
                            ),
                        )
                        # Update job progress
                        percent = round((completed_pages_total / max(1, total_pages_all_selected)) * 100, 1)
                        conn.execute(
                            """
                            UPDATE conversion_jobs 
                            SET completed_chapters = ?, progress_percent = ?, current_stage = 'Validating output'
                            WHERE id = ?
                            """,
                            (completed_count, percent, job_id),
                        )
                    conn.close()

                    self.broadcast_sync(
                        "chapter_completed",
                        {
                            "job_id": job_id,
                            "project_id": project_id,
                            "chapter_id": chapter_id,
                            "completed_chapters": completed_count,
                            "total_chapters": total_selected,
                            "progress_percent": percent,
                        },
                    )

                except InterruptedError:
                    if self.cancel_flags.get(job_id):
                        self.log(job_id, project_id, f"Conversion of Chapter {ch_num} cancelled by user.", level="WARNING")
                    elif self.pause_flags.get(job_id):
                        self.log(job_id, project_id, f"Conversion of Chapter {ch_num} paused by user.", level="INFO")
                    return
                except Exception as ch_err:
                    err_msg = str(ch_err)
                    logger.error(f"Error converting chapter {ch_num}: {err_msg}\n{traceback.format_exc()}")
                    conn = get_db()
                    with conn:
                        conn.execute(
                            "UPDATE chapters SET status = 'failed', error_message = ? WHERE id = ?",
                            (err_msg, chapter_id),
                        )
                    conn.close()
                    self.log(
                        job_id,
                        project_id,
                        f"Failed chapter {ch_num} ({ch_title}): {err_msg}",
                        level="ERROR",
                        stage="error",
                        chapter_id=chapter_id,
                    )

            # Check if all completed or partially completed
            conn = get_db()
            final_chapters = conn.execute(
                "SELECT status FROM chapters WHERE project_id = ? AND is_selected = 1", (project_id,)
            ).fetchall()
            conn.close()

            has_failed = any(c["status"] == "failed" for c in final_chapters)
            final_job_status = "completed" if not has_failed else "completed_with_errors"

            conn = get_db()
            with conn:
                conn.execute(
                    """
                    UPDATE conversion_jobs 
                    SET status = ?, progress_percent = 100.0, current_stage = 'Completed', completed_at = ?
                    WHERE id = ?
                    """,
                    (final_job_status, utcnow_str(), job_id),
                )
                conn.execute("UPDATE projects SET status = 'completed' WHERE id = ?", (project_id,))
            conn.close()

            self.log(
                job_id,
                project_id,
                f"Conversion completed successfully for all {completed_count}/{total_selected} chapters.",
            )
            self.broadcast_sync("job_completed", {"job_id": job_id, "project_id": project_id})

        except Exception as e:
            err = str(e)
            logger.error(f"Job {job_id} encountered unexpected failure: {err}\n{traceback.format_exc()}")
            conn = get_db()
            with conn:
                conn.execute(
                    "UPDATE conversion_jobs SET status = 'failed', error_message = ? WHERE id = ?",
                    (err, job_id),
                )
                conn.execute("UPDATE projects SET status = 'failed' WHERE id = ?", (project_id,))
            conn.close()
            self.log(job_id, project_id, f"Fatal error in job: {err}", level="ERROR")
            self.broadcast_sync("job_failed", {"job_id": job_id, "error": err})
        finally:
            self.active_threads.pop(job_id, None)


# Global job manager instance
job_manager = JobQueueManager()
