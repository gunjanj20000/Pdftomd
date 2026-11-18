import React, { useState } from 'react';
import {
  Library,
  Search,
  BookOpen,
  FolderArchive,
  Trash2,
  Copy,
  Edit2,
  Play,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Project } from '../../types';
import { api } from '../../api/client';
import { NavTab } from '../layout/Sidebar';

interface LibraryViewProps {
  projects: Project[];
  onSelectProject: (project: Project, tab?: NavTab) => void;
  onRefreshProjects: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  projects,
  onSelectProject,
  onRefreshProjects,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this book project and all its files?')) return;
    try {
      await api.deleteProject(projectId);
      onRefreshProjects();
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    try {
      await api.duplicateProject(projectId);
      onRefreshProjects();
    } catch (e: any) {
      alert(`Duplicate failed: ${e.message}`);
    }
  };

  const handleRename = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await api.updateProject(projectId, { title: editTitle.trim() });
      setEditingId(null);
      onRefreshProjects();
    } catch (e: any) {
      alert(`Rename failed: ${e.message}`);
    }
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.author && p.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by title, author, or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Statuses ({projects.length})</option>
            <option value="uploaded">Uploaded</option>
            <option value="ready">Ready (Chapters Detected)</option>
            <option value="converting">Converting</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
          <Library className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Book Projects Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {projects.length === 0
              ? 'No books in your library yet. Upload a PDF book to begin.'
              : 'No projects match your current search and filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project) => {
            const isEditing = editingId === project.id;

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project, 'chapters')}
                className="bg-[#111827] border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between cursor-pointer group hover:shadow-indigo-500/5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/10 group-hover:border-indigo-500/30 transition-all shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>

                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold capitalize border ${
                        project.status === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : project.status === 'converting'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                          : project.status === 'ready'
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
                      />
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => handleRename(e, project.id)}
                          className="px-2 py-1 text-[11px] rounded bg-indigo-600 text-white font-medium"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3
                        className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1"
                        title={project.title}
                      >
                        {project.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {project.author || 'Unknown Author'}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 block">Pages:</span>
                      <span className="font-semibold text-slate-300">{project.page_count} pp.</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">File Size:</span>
                      <span className="font-semibold text-slate-300">{formatBytes(project.filesize)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(project.id);
                        setEditTitle(project.title);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(e, project.id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800"
                      title="Duplicate Project"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {project.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(project, 'export');
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      >
                        Export
                      </button>
                    )}
                    <button
                      onClick={() => onSelectProject(project, 'chapters')}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 shadow-sm"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
