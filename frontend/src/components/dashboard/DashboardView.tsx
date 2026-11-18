import React from 'react';
import {
  UploadCloud,
  BookOpen,
  FileText,
  HardDrive,
  Activity,
  FileDown,
  Clock,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Project, SystemStats } from '../../types';
import { NavTab } from '../layout/Sidebar';
import { api } from '../../api/client';

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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Minimalist Hero & Drop Zone */}
      <div className="bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl">
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold block mb-2">
            Document Studio
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Turn PDF Books into Sliced Chapter PDFs & Clean Markdown
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400 leading-relaxed">
            Intelligently identifies chapter boundaries from embedded bookmarks or table of contents.
            Save individual chapters as authentic PDFs or export complete Markdown archives.
          </p>
        </div>

        {/* Minimalist File Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-6 border border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-indigo-400 bg-indigo-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
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
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-200">
              Drop your PDF book here, or <span className="text-indigo-400 hover:underline">browse file</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports textbooks, manuals, and documents with bookmarks or TOC
            </p>
          </label>
        </div>
      </div>

      {/* Lightweight Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0E131F]/90 border border-slate-800/70 rounded-xl p-4">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Books in Library</p>
          <h3 className="text-lg font-semibold text-white mt-1">
            {stats ? stats.total_projects : 0}
          </h3>
        </div>

        <div className="bg-[#0E131F]/90 border border-slate-800/70 rounded-xl p-4">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Chapters Converted</p>
          <h3 className="text-lg font-semibold text-white mt-1">
            {stats ? stats.total_chapters_converted : 0}
          </h3>
        </div>

        <div className="bg-[#0E131F]/90 border border-slate-800/70 rounded-xl p-4">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Storage</p>
          <h3 className="text-lg font-semibold text-white mt-1">
            {stats ? formatBytes(stats.total_storage_bytes) : '0 B'}
          </h3>
        </div>

        <div className="bg-[#0E131F]/90 border border-slate-800/70 rounded-xl p-4">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Queue Jobs</p>
          <h3 className="text-lg font-semibold text-white mt-1">
            {stats ? stats.active_jobs : 0}
          </h3>
        </div>
      </div>

      {/* Recent Books List */}
      <div className="bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/20">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <h3 className="text-xs sm:text-sm font-semibold text-white">Recent Documents</h3>
          </div>
          <button
            onClick={() => onNavigate('library')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No books uploaded yet. Upload a PDF above to begin.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {recentProjects.slice(0, 5).map((project) => (
              <div
                key={project.id}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              >
                <div
                  onClick={() => onSelectProject(project, 'chapters')}
                  className="flex items-center space-x-3 min-w-0 pr-4 flex-1 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate hover:text-indigo-300 transition-colors">
                      {project.title}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {project.page_count} pages • {formatBytes(project.filesize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 shrink-0">
                  {/* Quick Save PDF Chapters shortcut */}
                  <a
                    href={api.getChaptersPdfZipUrl(project.id)}
                    download
                    className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors"
                    title="Save all chapters as separate PDFs (ZIP)"
                  >
                    <FileDown className="w-3 h-3 text-indigo-400" />
                    <span>PDF Chapters</span>
                  </a>

                  <button
                    onClick={() => onSelectProject(project, 'chapters')}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
