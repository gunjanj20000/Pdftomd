import React from 'react';
import {
  UploadCloud,
  BookOpen,
  FileText,
  HardDrive,
  Activity,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Project, SystemStats } from '../../types';
import { NavTab } from '../layout/Sidebar';

interface DashboardViewProps {
  stats: SystemStats | null;
  recentProjects: Project[];
  onSelectProject: (project: Project, tab?: NavTab) => void;
  onNavigate: (tab: NavTab) => void;
  onFileDrop: (files: FileList | File[]) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentProjects,
  onSelectProject,
  onNavigate,
  onFileDrop,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileDrop(e.target.files);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/50 via-slate-900 to-violet-950/40 border border-indigo-500/20 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Intelligent Textbook & Reference Document Processor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Transform PDF Books into Clean, Chapter-by-Chapter Markdown
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            High-fidelity document studio powered by PyMuPDF4LLM. Automatically detects chapter boundaries using
            embedded bookmarks, printed table of contents, visual font headings, or manual controls. Preserves tables, images, and math notation.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload PDF Book</span>
            </button>
            <button
              onClick={() => onNavigate('library')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>Browse Library</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-5 flex items-center space-x-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Books</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {stats ? stats.total_projects : 0}
            </h3>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-5 flex items-center space-x-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Chapters Converted</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {stats ? stats.total_chapters_converted : 0}
            </h3>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-5 flex items-center space-x-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Storage Used</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {stats ? formatBytes(stats.total_storage_bytes) : '0 B'}
            </h3>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 sm:p-5 flex items-center space-x-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Queue</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              {stats ? stats.active_jobs : 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Large Drag and Drop Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-700 hover:border-indigo-500/60 bg-[#111827]/70'
        }`}
      >
        <input
          type="file"
          id="dashboard-file-upload"
          accept=".pdf"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <label
          htmlFor="dashboard-file-upload"
          className="cursor-pointer flex flex-col items-center justify-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Drag & drop your PDF book here, or <span className="text-indigo-400 underline decoration-indigo-500 underline-offset-4">browse files</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Supports large textbooks, medical manuals, and technical references up to 1 GB. Multi-file uploads supported.
          </p>
          <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Bookmarks Detection
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Table of Contents Parsing
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Heading OCR & Heuristics
            </span>
          </div>
        </label>
      </div>

      {/* Recent Projects Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Recent Books in Studio</h3>
          </div>
          <button
            onClick={() => onNavigate('library')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No books uploaded yet. Upload a PDF above to begin.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 overflow-x-auto">
            {recentProjects.slice(0, 5).map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project, 'chapters')}
                className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3.5 min-w-0 pr-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 shrink-0">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">{project.title}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {project.author || 'Unknown Author'} • {project.page_count} pages • {formatBytes(project.filesize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium capitalize border ${
                      project.status === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : project.status === 'converting'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                        : project.status === 'ready'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        : 'bg-slate-700/30 border-slate-600/30 text-slate-400'
                    }`}
                  >
                    {project.status}
                  </span>

                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
