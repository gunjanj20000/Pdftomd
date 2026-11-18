import React, { useState } from 'react';
import {
  Download,
  FolderArchive,
  FileText,
  FileCode,
  FileDown,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Database,
  Layers,
} from 'lucide-react';
import { Chapter, Project } from '../../types';
import { api } from '../../api/client';

interface ExportViewProps {
  project: Project;
  chapters: Chapter[];
}

export const ExportView: React.FC<ExportViewProps> = ({
  project,
  chapters,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'markdown' | 'ai'>('pdf');
  const completedChapters = chapters.filter((c) => c.status === 'completed' || c.markdown_path);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Minimalist Top Header */}
      <div className="bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                Export & Download
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Save chapters as standalone sliced PDFs or export structured Markdown documents for {project.title}.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Download All Chapters as PDF */}
            <a
              href={api.getChaptersPdfZipUrl(project.id)}
              download
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
              title="Download all chapters sliced as separate PDF files in a ZIP"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>All Chapters (PDF ZIP)</span>
            </a>

            {/* Quick Download Markdown ZIP */}
            <a
              href={api.getZipExportUrl(project.id)}
              download
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Markdown ZIP</span>
            </a>
          </div>
        </div>

        {/* Minimalist Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-5 pt-3.5 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'pdf'
                ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>PDF Chapters</span>
            <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded">
              {chapters.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('markdown')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'markdown'
                ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Markdown Package</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'ai'
                ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI & Vector DB</span>
          </button>
        </div>
      </div>

      {/* Tab 1: PDF Chapters (Split as PDF) */}
      {activeTab === 'pdf' && (
        <div className="space-y-4">
          {/* Sliced PDF Overview Banner */}
          <div className="p-4 bg-[#0E131F]/90 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <FileDown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-white">
                  Save All Chapters as Standalone PDFs
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Lossless extraction directly from the source PDF. Preserves original vector graphics, crisp typography, and full quality without requiring Markdown conversion.
                </p>
              </div>
            </div>

            <a
              href={api.getChaptersPdfZipUrl(project.id)}
              download
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All Chapters (.ZIP)</span>
            </a>
          </div>

          {/* Individual Chapter PDF Table */}
          <div className="bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/30">
              <span className="text-xs font-semibold text-slate-200">
                Individual Chapter PDFs
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {chapters.length} chapters available
              </span>
            </div>

            <div className="divide-y divide-slate-800/50 max-h-[500px] overflow-y-auto">
              {chapters.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className="w-6 text-xs font-mono text-slate-500 shrink-0">
                      {String(c.chapter_num).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        {c.title}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Pages {c.start_page}–{c.end_page} ({c.page_count} pages)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={api.getChapterPdfUrl(project.id, c.id)}
                      download
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                      title={`Download Chapter ${c.chapter_num} as PDF`}
                    >
                      <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Markdown Package */}
      {activeTab === 'markdown' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full ZIP */}
          <div className="p-4 bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <FolderArchive className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Full Markdown Archive (ZIP)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Includes README index, all chapter .md files, images, and metadata JSON.
                </p>
              </div>
            </div>
            <a
              href={api.getZipExportUrl(project.id)}
              download
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
            >
              ZIP
            </a>
          </div>

          {/* Combined Single MD */}
          <div className="p-4 bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Single Combined Book (.md)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All chapters concatenated with section dividers into one file.
                </p>
              </div>
            </div>
            <a
              href={api.getCombinedExportUrl(project.id)}
              download
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0"
            >
              Download
            </a>
          </div>

          {/* Book Metadata JSON */}
          <div className="p-4 bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Metadata JSON</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Structured chapter offsets, page numbers, and engine parameters.
                </p>
              </div>
            </div>
            <a
              href={api.getMetadataExportUrl(project.id)}
              download
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0"
            >
              JSON
            </a>
          </div>

          {/* Converted Chapters Count Card */}
          <div className="p-4 bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Conversion Status</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {completedChapters.length} of {chapters.length} chapters converted to Markdown.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AI & Vector DB Integration */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vector DB JSONL */}
          <div className="p-4 bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Vector DB lines (documents.jsonl)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ready for LangChain, LlamaIndex, ChromaDB, Qdrant, and Pinecone.
                </p>
              </div>
            </div>
            <a
              href={api.getJsonlExportUrl(project.id)}
              download
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0"
            >
              .jsonl
            </a>
          </div>

          {/* Full AI RAG Bundle */}
          <div className="p-4 bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">NotebookLM & RAG Bundle</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  YAML frontmatter headers, clean text embeddings, and figures.
                </p>
              </div>
            </div>
            <a
              href={api.getAiRagZipUrl(project.id)}
              download
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
            >
              ZIP
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
