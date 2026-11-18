import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Bookmark,
  ListOrdered,
  Clock,
  Cpu,
  Eye,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Project } from '../../types';
import { api } from '../../api/client';

interface DocumentInspectorProps {
  project: Project;
  onDetectChapters: (method: string, maxLevel?: number) => void;
  onDeleteProject: (projectId: string) => void;
  isDetecting: boolean;
}

export const DocumentInspector: React.FC<DocumentInspectorProps> = ({
  project,
  onDetectChapters,
  onDeleteProject,
  isDetecting,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('bookmarks');
  const [maxLevel, setMaxLevel] = useState<number>(1);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Parse metadata if available
  let meta: any = {};
  try {
    if (project.metadata_json) meta = JSON.parse(project.metadata_json);
  } catch (_) {}

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleOpenPreview = () => {
    setPreviewPage(1);
    setShowPreviewModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title info */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{project.title}</h2>
                <span className="text-[11px] font-semibold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  PDF
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                By <span className="text-slate-200 font-medium">{project.author || 'Unknown Author'}</span> • File: <span className="font-mono text-slate-300">{project.filename}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPreview}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Preview Pages</span>
            </button>
            <button
              onClick={() => onDeleteProject(project.id)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Total Pages</span>
            <p className="text-lg font-bold text-white mt-0.5">{project.page_count} pages</p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">File Size</span>
            <p className="text-lg font-bold text-white mt-0.5">{formatBytes(project.filesize)}</p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Estimated Time</span>
            <p className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              ~{meta.estimated_seconds || Math.max(5, Math.round(project.page_count * 0.15))}s
            </p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Estimated RAM</span>
            <p className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-violet-400" />
              ~{meta.estimated_memory_mb || 180} MB
            </p>
          </div>
        </div>
      </div>

      {/* Structural Inspection Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-indigo-400" />
            Document Structure Analysis
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-3">
                <Bookmark className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">PDF Outline Bookmarks</p>
                  <p className="text-[11px] text-slate-400">Embedded table of contents markers</p>
                </div>
              </div>
              {project.has_bookmarks ? (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Available ({meta.bookmark_count || 'Yes'})
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
                  None Found
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-3">
                <ListOrdered className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Printed Table of Contents</p>
                  <p className="text-[11px] text-slate-400">Detected on initial textbook pages</p>
                </div>
              </div>
              {project.has_toc ? (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Detected
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
                  Not Detected
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Text & Layout Type</p>
                  <p className="text-[11px] text-slate-400">Digital selectable text or scanned images</p>
                </div>
              </div>
              {meta.is_likely_scanned ? (
                <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  Scanned (OCR Recommended)
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Digital Vector Text
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chapter Detection Options & Trigger Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Intelligent Chapter Detection
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Choose the primary detection strategy for chapter boundaries.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Detection Method
                </label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="bookmarks">Method A: PDF Bookmarks (Recommended if present)</option>
                  <option value="toc">Method B: Printed Table of Contents Pages</option>
                  <option value="heading">Method C: Automatic Heading & Font Analysis</option>
                  <option value="heuristic">Method E: Heuristic Layout Segmentation</option>
                  <option value="all">Auto Best-Fit (Tries Bookmarks → TOC → Headings)</option>
                </select>
              </div>

              {selectedMethod === 'bookmarks' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Bookmark Level Depth
                  </label>
                  <select
                    value={maxLevel}
                    onChange={(e) => setMaxLevel(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={1}>Level 1 Only (Main Chapters only)</option>
                    <option value={2}>Level 1 & 2 (Chapters + Major Subsections)</option>
                    <option value={3}>Level 1, 2 & 3 (All bookmark levels)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => onDetectChapters(selectedMethod, maxLevel)}
              disabled={isDetecting}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              {isDetecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing & Detecting Chapters...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Detect Chapters & Open Review</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Note: Detection will not start conversion automatically. You will review all boundaries first.
            </p>
          </div>
        </div>
      </div>

      {/* PDF Page Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">
                  PDF Page Preview: Page {previewPage} of {project.page_count}
                </h4>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-300 px-1">{previewPage}</span>
                <button
                  disabled={previewPage >= project.page_count}
                  onClick={() => setPreviewPage(p => Math.min(project.page_count, p + 1))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Area */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#0B0F19]">
              <img
                src={api.getPagePreviewUrl(project.id, previewPage, 140)}
                alt={`Page ${previewPage}`}
                className="max-h-[75vh] w-auto object-contain rounded shadow-lg border border-slate-800"
                onLoad={() => setPreviewLoading(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
