export interface Project {
  id: string;
  title: string;
  author?: string;
  filename: string;
  filepath: string;
  filesize: number;
  page_count: number;
  is_encrypted: boolean;
  has_bookmarks: boolean;
  has_toc: boolean;
  status: 'uploaded' | 'analyzed' | 'ready' | 'converting' | 'paused' | 'completed' | 'failed';
  output_dir?: string;
  metadata_json?: string;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  project_id: string;
  chapter_num: number;
  title: string;
  start_page: number;
  end_page: number;
  page_count: number;
  level: number;
  detection_method: 'bookmarks' | 'toc' | 'heading' | 'manual' | 'heuristic';
  status: 'pending' | 'converting' | 'completed' | 'failed' | 'skipped';
  is_selected: boolean;
  markdown_path?: string;
  markdown_size: number;
  image_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversionJob {
  id: string;
  project_id: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'completed_with_errors' | 'cancelled' | 'failed';
  total_chapters: number;
  completed_chapters: number;
  current_chapter_id?: string;
  current_chapter_title?: string;
  current_page: number;
  progress_percent: number;
  current_stage: string;
  speed_pages_per_sec: number;
  eta_seconds: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ConversionSettings {
  id?: string;
  project_id?: string;
  preserve_headings: boolean;
  preserve_tables: boolean;
  table_format: 'markdown' | 'html';
  extract_images: boolean;
  image_format: 'png' | 'jpg';
  min_image_dimension: number;
  image_quality: number;
  include_page_numbers: boolean;
  remove_repeated_headers: boolean;
  remove_repeated_footers: boolean;
  enable_ocr: boolean;
  ocr_language: string;
  batch_size: number;
  output_format: 'individual' | 'combined' | 'both';
  custom_settings_json?: string;
}

export interface ProcessingLog {
  id: number;
  job_id?: string;
  project_id: string;
  chapter_id?: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  stage: string;
  message: string;
  timestamp: string;
}

export interface SystemStats {
  total_projects: number;
  total_chapters_converted: number;
  total_storage_bytes: number;
  active_jobs: number;
}

export interface OcrInfo {
  ocr_available: boolean;
  languages: string[];
  engine: string;
  description: string;
}

export interface ChapterAuditIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  category: 'short_chapter' | 'broken_image' | 'malformed_table' | 'encoding_artifact' | 'heading_syntax';
  message: string;
  line_number?: number;
  snippet?: string;
  suggestion?: string;
}

export interface ChapterAudit {
  chapter_id: string;
  chapter_num: number;
  title: string;
  status: 'healthy' | 'needs_review' | 'errors_found' | 'missing_file';
  score: number;
  word_count: number;
  char_count: number;
  image_count: number;
  table_count: number;
  issues: ChapterAuditIssue[];
}

export interface QualityAuditReport {
  project_id: string;
  book_title: string;
  overall_score: number;
  health_status: 'excellent' | 'good' | 'needs_attention';
  total_words: number;
  estimated_tokens: number;
  total_images_verified: number;
  total_tables_verified: number;
  total_errors: number;
  total_warnings: number;
  chapters: ChapterAudit[];
}
