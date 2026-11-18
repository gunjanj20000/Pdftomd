import {
  Project,
  Chapter,
  ConversionJob,
  ConversionSettings,
  ProcessingLog,
  SystemStats,
  OcrInfo,
  QualityAuditReport,
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed: ${res.statusText}`;
    try {
      const errData = await res.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Projects
  async uploadPdfs(files: File[], onProgress?: (pct: number) => void): Promise<Project[]> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/projects/upload`);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload'));
      xhr.send(formData);
    });
  },

  async listProjects(search?: string, status?: string): Promise<Project[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE}/projects?${params.toString()}`);
    return handleResponse<Project[]>(res);
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    return handleResponse<Project>(res);
  },

  async updateProject(id: string, data: { title?: string; author?: string }): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Project>(res);
  },

  async deleteProject(id: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    return handleResponse(res);
  },

  async duplicateProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, { method: 'POST' });
    return handleResponse<Project>(res);
  },

  getPagePreviewUrl(projectId: string, pageNumber: number, dpi: number = 120): string {
    return `${API_BASE}/projects/${projectId}/preview-page/${pageNumber}?dpi=${dpi}`;
  },

  // Chapters
  async getChapters(projectId: string): Promise<Chapter[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters`);
    return handleResponse<Chapter[]>(res);
  },

  async detectChapters(
    projectId: string,
    params: {
      method: string;
      max_level?: number;
      min_pages_per_chapter?: number;
      toc_scan_pages?: number;
    }
  ): Promise<Chapter[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<Chapter[]>(res);
  },

  async updateChapter(
    projectId: string,
    chapterId: string,
    data: Partial<Chapter>
  ): Promise<Chapter> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/${chapterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Chapter>(res);
  },

  async addChapter(projectId: string, chapter: Partial<Chapter>): Promise<Chapter> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chapter),
    });
    return handleResponse<Chapter>(res);
  },

  async deleteChapter(projectId: string, chapterId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/${chapterId}`, {
      method: 'DELETE',
    });
    await handleResponse(res);
  },

  async reconvertChapter(
    projectId: string,
    chapterId: string,
    customSettings?: Partial<ConversionSettings>
  ): Promise<Chapter> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/${chapterId}/reconvert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customSettings || {}),
    });
    return handleResponse<Chapter>(res);
  },

  async reconvertBatch(
    projectId: string,
    chapterIds: string[],
    customSettings?: Partial<ConversionSettings>
  ): Promise<Chapter[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/reconvert-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chapterIds),
    });
    return handleResponse<Chapter[]>(res);
  },

  async getQualityAudit(projectId: string): Promise<QualityAuditReport> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/quality-audit`);
    return handleResponse<QualityAuditReport>(res);
  },

  async splitChapter(
    projectId: string,
    chapterId: string,
    splitPage: number,
    firstTitle?: string,
    secondTitle?: string
  ): Promise<Chapter[]> {
    const res = await fetch(
      `${API_BASE}/projects/${projectId}/chapters/split?chapter_id=${chapterId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          split_page: splitPage,
          first_title: firstTitle,
          second_title: secondTitle,
        }),
      }
    );
    return handleResponse<Chapter[]>(res);
  },

  async mergeChapters(
    projectId: string,
    chapterIds: string[],
    mergedTitle?: string
  ): Promise<Chapter[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_ids: chapterIds, merged_title: mergedTitle }),
    });
    return handleResponse<Chapter[]>(res);
  },

  // Jobs
  async startConversion(projectId: string): Promise<ConversionJob> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/convert`, {
      method: 'POST',
    });
    return handleResponse<ConversionJob>(res);
  },

  async listJobs(projectId?: string): Promise<ConversionJob[]> {
    const url = projectId ? `${API_BASE}/jobs?project_id=${projectId}` : `${API_BASE}/jobs`;
    const res = await fetch(url);
    return handleResponse<ConversionJob[]>(res);
  },

  async getJob(jobId: string): Promise<ConversionJob> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`);
    return handleResponse<ConversionJob>(res);
  },

  async pauseJob(jobId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/pause`, { method: 'POST' });
    await handleResponse(res);
  },

  async resumeJob(jobId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/resume`, { method: 'POST' });
    await handleResponse(res);
  },

  async cancelJob(jobId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/cancel`, { method: 'POST' });
    await handleResponse(res);
  },

  async retryChapter(projectId: string, chapterId: string): Promise<{ status: string; job_id: string }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/retry/${chapterId}`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async getJobLogs(jobId: string): Promise<ProcessingLog[]> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/logs`);
    return handleResponse<ProcessingLog[]>(res);
  },

  async getProjectLogs(projectId: string): Promise<ProcessingLog[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/logs`);
    return handleResponse<ProcessingLog[]>(res);
  },

  // Markdown
  async getChapterMarkdown(projectId: string, chapterId: string): Promise<{
    chapter_id: string;
    title: string;
    content: string;
    file_path: string;
    file_size: number;
  }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/${chapterId}/markdown`);
    return handleResponse(res);
  },

  async updateChapterMarkdown(
    projectId: string,
    chapterId: string,
    content: string
  ): Promise<{
    chapter_id: string;
    title: string;
    content: string;
    file_path: string;
    file_size: number;
  }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chapters/${chapterId}/markdown`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return handleResponse(res);
  },

  async getCombinedMarkdown(projectId: string): Promise<{
    project_id: string;
    title: string;
    content: string;
  }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/combined-markdown`);
    return handleResponse(res);
  },

  // Export URLs
  getZipExportUrl(projectId: string): string {
    return `${API_BASE}/projects/${projectId}/export/zip`;
  },

  getCombinedExportUrl(projectId: string): string {
    return `${API_BASE}/projects/${projectId}/export/combined`;
  },

  getMetadataExportUrl(projectId: string): string {
    return `${API_BASE}/projects/${projectId}/export/metadata`;
  },

  getChapterExportUrl(projectId: string, chapterId: string): string {
    return `${API_BASE}/projects/${projectId}/export/chapter/${chapterId}`;
  },

  getChapterPdfUrl(projectId: string, chapterId: string): string {
    return `${API_BASE}/projects/${projectId}/export/chapter/${chapterId}/pdf`;
  },

  getChaptersPdfZipUrl(projectId: string): string {
    return `${API_BASE}/projects/${projectId}/export/chapters-pdf-zip`;
  },

  getAiRagZipUrl(projectId: string): string {
    return `${API_BASE}/projects/${projectId}/export/ai-rag-zip`;
  },

  getJsonlExportUrl(projectId: string): string {
    return `${API_BASE}/projects/${projectId}/export/documents.jsonl`;
  },

  // Settings & System
  async getSettings(projectId?: string): Promise<ConversionSettings> {
    const url = projectId ? `${API_BASE}/settings?project_id=${projectId}` : `${API_BASE}/settings`;
    const res = await fetch(url);
    return handleResponse<ConversionSettings>(res);
  },

  async updateSettings(settings: ConversionSettings, projectId?: string): Promise<ConversionSettings> {
    const url = projectId ? `${API_BASE}/settings?project_id=${projectId}` : `${API_BASE}/settings`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return handleResponse<ConversionSettings>(res);
  },

  async getOcrInfo(): Promise<OcrInfo> {
    const res = await fetch(`${API_BASE}/settings/ocr-info`);
    return handleResponse<OcrInfo>(res);
  },

  async getSystemStats(): Promise<SystemStats> {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse<SystemStats>(res);
  },

  async clearCache(): Promise<{ status: string; deleted_items: number }> {
    const res = await fetch(`${API_BASE}/settings/clear-cache`, { method: 'POST' });
    return handleResponse(res);
  },
};
