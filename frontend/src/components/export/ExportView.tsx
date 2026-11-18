import React, { useState } from 'react';
import {
  Download,
  FolderArchive,
  FileText,
  FileCode,
  FolderTree,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Database,
  Bot,
  Zap,
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
  const completedChapters = chapters.filter((c) => c.status === 'completed' || c.markdown_path);
  const [activeTab, setActiveTab] = useState<'standard' | 'ai_rag'>('standard');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderArchive className="w-6 h-6 text-indigo-400" />
              Export & Package Book: {project.title}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Package your converted Markdown documents for readers, publication archives, or AI ingestion pipelines.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={api.getZipExportUrl(project.id)}
              download
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Standard ZIP</span>
            </a>
            <a
              href={api.getAiRagZipUrl(project.id)}
              download
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>AI / RAG Bundle (ZIP)</span>
            </a>
          </div>
        </div>

        {/* Export Mode Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('standard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'standard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Standard Markdown Packaging</span>
          </button>
          <button
            onClick={() => setActiveTab('ai_rag')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'ai_rag'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI-Ready Export (NotebookLM, DeepTutor, RAG, LLMs)</span>
          </button>
        </div>
      </div>

      {activeTab === 'standard' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Standard Formats */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              Standard Archive Formats
            </h3>

            {/* Complete ZIP Bundle */}
            <div className="p-4 bg-[#111827] border border-indigo-500/30 rounded-2xl shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Full ZIP Archive</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Includes README.md index, all chapter files, images directory, and metadata JSON.
                  </p>
                </div>
              </div>
              <a
                href={api.getZipExportUrl(project.id)}
                download
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
              >
                ZIP
              </a>
            </div>

            {/* Combined Single Markdown File */}
            <div className="p-4 bg-[#111827] border border-slate-800 rounded-2xl shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Complete Book as Single .md</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Concatenates all chapters in sequential order with section dividers into one file.
                  </p>
                </div>
              </div>
              <a
                href={api.getCombinedExportUrl(project.id)}
                download
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0"
              >
                Download .md
              </a>
            </div>

            {/* JSON Metadata */}
            <div className="p-4 bg-[#111827] border border-slate-800 rounded-2xl shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Book Metadata JSON</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Machine-readable chapter boundaries, page offsets, image tallies, and engine settings.
                  </p>
                </div>
              </div>
              <a
                href={api.getMetadataExportUrl(project.id)}
                download
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0"
              >
                JSON
              </a>
            </div>
          </div>

          {/* Structure Visualization */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <FolderTree className="w-4 h-4 text-indigo-400" />
                Standard Archive Layout
              </h3>

              <div className="bg-[#080C14] border border-slate-800/80 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto">
                <div className="text-indigo-400 font-bold">{project.title}/</div>
                <div className="pl-4 text-slate-300">├── README.md <span className="text-slate-500">(Index with links)</span></div>
                <div className="pl-4 text-slate-300">├── book_metadata.json <span className="text-slate-500">(Book stats)</span></div>
                <div className="pl-4 text-emerald-400 font-semibold">├── chapters/</div>
                {completedChapters.slice(0, 4).map((c) => (
                  <div key={c.id} className="pl-8 text-slate-400">
                    ├── {c.chapter_num.toString().padStart(3, '0')}_{c.title.replace(/\s+/g, '_').slice(0, 25)}.md
                  </div>
                ))}
                {completedChapters.length > 4 && (
                  <div className="pl-8 text-slate-600">└── ... ({completedChapters.length - 4} more chapters)</div>
                )}
                <div className="pl-4 text-violet-400 font-semibold">└── images/</div>
                <div className="pl-8 text-slate-500">├── [extracted_figures]</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Relative links `![](images/...)` render in Obsidian, VS Code, and Typora.</span>
            </div>
          </div>
        </div>
      ) : (
        /* AI & RAG Ready Export Section */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              AI & RAG Packaging Formats
            </h3>

            {/* AI RAG Complete ZIP */}
            <div className="p-4 bg-gradient-to-tr from-indigo-950/40 via-slate-900 to-violet-950/40 border border-indigo-500/40 rounded-2xl shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Full AI / RAG Bundle (ZIP)</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Pre-chunked with YAML frontmatter, RAG manifest.json, documents.jsonl, clean text, and multimodal figures.
                  </p>
                </div>
              </div>
              <a
                href={api.getAiRagZipUrl(project.id)}
                download
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 shadow-md shadow-indigo-600/30"
              >
                ZIP
              </a>
            </div>

            {/* documents.jsonl */}
            <div className="p-4 bg-[#111827] border border-slate-800 rounded-2xl shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Direct Vector DB (documents.jsonl)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ready for LangChain, LlamaIndex, ChromaDB, Qdrant, Pinecone, and Weaviate.
                  </p>
                </div>
              </div>
              <a
                href={api.getJsonlExportUrl(project.id)}
                download
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0"
              >
                .jsonl
              </a>
            </div>

            {/* Target AI Ecosystems Grid */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Target AI & LLM Ecosystems
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                  Google NotebookLM
                </span>
                <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                  DeepTutor RAG
                </span>
                <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                  LangChain / LlamaIndex
                </span>
                <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                  ChromaDB / Qdrant
                </span>
                <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                  Ollama / LM Studio
                </span>
              </div>
            </div>
          </div>

          {/* AI Bundle Structure Tree */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-violet-400" />
                AI / RAG Directory Architecture
              </h3>

              <div className="bg-[#080C14] border border-slate-800/80 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto">
                <div className="text-indigo-400 font-bold">{project.title}_AI_RAG/</div>
                <div className="pl-4 text-emerald-400 font-semibold">├── manifest.json <span className="text-slate-500">(Token maps & chunk schema)</span></div>
                <div className="pl-4 text-emerald-400 font-semibold">├── documents.jsonl <span className="text-slate-500">(Vector DB lines)</span></div>
                <div className="pl-4 text-indigo-300 font-semibold">├── notebooklm_ready/</div>
                <div className="pl-8 text-slate-400">├── 001_Introduction.md <span className="text-slate-500">(With YAML frontmatter)</span></div>
                <div className="pl-8 text-slate-400">├── 002_Anatomy.md</div>
                <div className="pl-4 text-cyan-400 font-semibold">├── clean_text/</div>
                <div className="pl-8 text-slate-400">├── 001_Introduction.txt <span className="text-slate-500">(Pure text for embeddings)</span></div>
                <div className="pl-4 text-violet-400 font-semibold">└── images/</div>
                <div className="pl-8 text-slate-500">├── [high_res_multimodal_figures]</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Each Markdown file contains standardized YAML frontmatter for instant NotebookLM indexing.</span>
            </div>
          </div>
        </div>
      )}

      {/* Individual Chapters List with Selective Reconversion Shortcuts */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Individual Chapter Files</h3>
          <span className="text-xs text-slate-400">{completedChapters.length} Converted Chapters</span>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
          {completedChapters.map((c) => (
            <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center space-x-3">
                <span className="w-6 text-xs font-mono font-bold text-slate-500">{c.chapter_num}</span>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{c.title}</p>
                  <p className="text-[11px] text-slate-500">
                    Pages {c.start_page}–{c.end_page} ({c.page_count} pp.) • {c.markdown_size ? `${Math.round(c.markdown_size / 1024)} KB` : 'Converted'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={api.getChapterExportUrl(project.id, c.id)}
                  download
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
