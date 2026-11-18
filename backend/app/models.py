from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ProjectBase(BaseModel):
    title: str
    author: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    author: Optional[str] = None
    filename: str
    filepath: str
    filesize: int
    page_count: int
    is_encrypted: bool
    has_bookmarks: bool
    has_toc: bool
    status: str
    output_dir: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: str
    updated_at: str


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None


class ChapterBase(BaseModel):
    chapter_num: int
    title: str
    start_page: int
    end_page: int
    level: int = 1
    is_selected: bool = True


class ChapterCreate(ChapterBase):
    detection_method: str = "manual"


class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    is_selected: Optional[bool] = None
    level: Optional[int] = None


class ChapterResponse(BaseModel):
    id: str
    project_id: str
    chapter_num: int
    title: str
    start_page: int
    end_page: int
    page_count: int
    level: int
    detection_method: str
    status: str
    is_selected: bool
    markdown_path: Optional[str] = None
    markdown_size: int = 0
    image_count: int = 0
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class ChapterBatchUpdate(BaseModel):
    chapters: List[ChapterResponse]


class ChapterSplitRequest(BaseModel):
    split_page: int
    first_title: Optional[str] = None
    second_title: Optional[str] = None


class ChapterMergeRequest(BaseModel):
    chapter_ids: List[str]
    merged_title: Optional[str] = None


class ChapterDetectionRequest(BaseModel):
    method: str = "bookmarks"  # 'bookmarks', 'toc', 'heading', 'heuristic', 'all'
    max_level: Optional[int] = 1  # 1 for main chapters, 2 for subchapters, etc.
    min_pages_per_chapter: int = 1
    toc_scan_pages: int = 25  # Number of initial pages to scan for printed TOC


class ConversionSettingsModel(BaseModel):
    preserve_headings: bool = True
    preserve_tables: bool = True
    table_format: str = "markdown"  # 'markdown' or 'html'
    extract_images: bool = True
    image_format: str = "png"  # 'png' or 'jpg'
    min_image_dimension: int = 50
    image_quality: int = 90
    include_page_numbers: bool = False
    remove_repeated_headers: bool = True
    remove_repeated_footers: bool = True
    enable_ocr: bool = False
    ocr_language: str = "eng"
    batch_size: int = 5
    output_format: str = "individual"  # 'individual', 'combined', 'both'
    custom_settings_json: Optional[str] = None


class ConversionSettingsResponse(ConversionSettingsModel):
    id: str
    project_id: str
    created_at: str
    updated_at: str


class ConversionJobResponse(BaseModel):
    id: str
    project_id: str
    status: str
    total_chapters: int
    completed_chapters: int
    current_chapter_id: Optional[str] = None
    current_chapter_title: Optional[str] = None
    current_page: int = 0
    progress_percent: float = 0.0
    current_stage: str = "queued"
    speed_pages_per_sec: float = 0.0
    eta_seconds: int = 0
    error_message: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class MarkdownContentResponse(BaseModel):
    chapter_id: str
    title: str
    content: str
    file_path: Optional[str] = None
    file_size: int = 0


class MarkdownUpdateRequest(BaseModel):
    content: str


class ProcessingLogEntry(BaseModel):
    id: int
    job_id: Optional[str] = None
    project_id: str
    chapter_id: Optional[str] = None
    level: str
    stage: str
    message: str
    timestamp: str


class SystemStatsResponse(BaseModel):
    total_projects: int
    total_chapters_converted: int
    total_storage_bytes: int
    active_jobs: int
