import sqlite3
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.config import DB_PATH

logger = logging.getLogger(__name__)


def get_db():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db():
    conn = get_db()
    with conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            filesize INTEGER NOT NULL,
            page_count INTEGER NOT NULL DEFAULT 0,
            is_encrypted INTEGER NOT NULL DEFAULT 0,
            has_bookmarks INTEGER NOT NULL DEFAULT 0,
            has_toc INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'uploaded',
            output_dir TEXT,
            metadata_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chapters (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            chapter_num INTEGER NOT NULL,
            title TEXT NOT NULL,
            start_page INTEGER NOT NULL,
            end_page INTEGER NOT NULL,
            page_count INTEGER NOT NULL,
            level INTEGER NOT NULL DEFAULT 1,
            detection_method TEXT NOT NULL DEFAULT 'manual',
            status TEXT NOT NULL DEFAULT 'pending',
            is_selected INTEGER NOT NULL DEFAULT 1,
            markdown_path TEXT,
            markdown_size INTEGER DEFAULT 0,
            image_count INTEGER DEFAULT 0,
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS conversion_jobs (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            total_chapters INTEGER NOT NULL DEFAULT 0,
            completed_chapters INTEGER NOT NULL DEFAULT 0,
            current_chapter_id TEXT,
            current_chapter_title TEXT,
            current_page INTEGER DEFAULT 0,
            progress_percent REAL NOT NULL DEFAULT 0.0,
            current_stage TEXT NOT NULL DEFAULT 'queued',
            speed_pages_per_sec REAL NOT NULL DEFAULT 0.0,
            eta_seconds INTEGER NOT NULL DEFAULT 0,
            error_message TEXT,
            created_at TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS conversion_settings (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            preserve_headings INTEGER NOT NULL DEFAULT 1,
            preserve_tables INTEGER NOT NULL DEFAULT 1,
            table_format TEXT NOT NULL DEFAULT 'markdown',
            extract_images INTEGER NOT NULL DEFAULT 1,
            image_format TEXT NOT NULL DEFAULT 'png',
            min_image_dimension INTEGER NOT NULL DEFAULT 50,
            image_quality INTEGER NOT NULL DEFAULT 90,
            include_page_numbers INTEGER NOT NULL DEFAULT 0,
            remove_repeated_headers INTEGER NOT NULL DEFAULT 1,
            remove_repeated_footers INTEGER NOT NULL DEFAULT 1,
            enable_ocr INTEGER NOT NULL DEFAULT 0,
            ocr_language TEXT NOT NULL DEFAULT 'eng',
            batch_size INTEGER NOT NULL DEFAULT 5,
            output_format TEXT NOT NULL DEFAULT 'individual',
            custom_settings_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS processing_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT,
            project_id TEXT NOT NULL,
            chapter_id TEXT,
            level TEXT NOT NULL DEFAULT 'INFO',
            stage TEXT NOT NULL DEFAULT 'general',
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_project ON conversion_jobs(project_id);
        CREATE INDEX IF NOT EXISTS idx_logs_job ON processing_logs(job_id);
        """)
    conn.close()
    logger.info("Database schema initialized successfully.")


def utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()
