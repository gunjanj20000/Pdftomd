import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Upload,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { Project } from '../../types';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeProject: Project | null;
  wsConnected: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeProject,
  wsConnected,
  theme,
  toggleTheme,
  onOpenMobileMenu,
}) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Overview', subtitle: 'Document library, processing metrics and quick conversion' },
    upload: { title: 'Upload Document', subtitle: 'Upload PDF files and inspect structural bookmarks' },
    chapters: { title: 'Chapters & PDF Split', subtitle: 'Extract chapters as standalone PDFs or convert to Markdown' },
    queue: { title: 'Activity Queue', subtitle: 'Live conversion status, pipeline progress and execution logs' },
    markdown: { title: 'Markdown Studio', subtitle: 'Edit and preview converted chapter markdown side-by-side' },
    audit: { title: 'Document Audit', subtitle: 'Verify formatting, tables, image extraction and document health' },
    export: { title: 'Export Center', subtitle: 'Save chapters as separate PDFs, download Markdown and metadata' },
    library: { title: 'Library', subtitle: 'Browse and manage your collection of PDF books and documents' },
    history: { title: 'History', subtitle: 'Past batch jobs and conversion metrics' },
    settings: { title: 'Settings', subtitle: 'Engine preferences, OCR language and extraction parameters' },
    help: { title: 'Help & Docs', subtitle: 'Documentation, detection techniques and guidance' },
  };

  const current = titles[activeTab] || { title: 'Studio', subtitle: '' };

  return (
    <header className="h-14 bg-[#0A0E17]/80 backdrop-blur-md border-b border-slate-800/50 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Mobile hamburger & Breadcrumb Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-white tracking-tight sm:text-sm">
            {current.title}
          </span>

          {activeProject && (
            <div className="hidden sm:flex items-center space-x-1.5 text-slate-500">
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-md font-medium max-w-[260px] truncate">
                <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="truncate">{activeProject.title}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Status Indicator & Quick Tools */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Subtle Live Status Indicator */}
        <div
          className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] text-slate-400"
          title={wsConnected ? 'Connected to live event stream' : 'Reconnecting to live event stream...'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wsConnected ? 'bg-emerald-400 ring-2 ring-emerald-500/20' : 'bg-amber-400 ring-2 ring-amber-500/20 animate-pulse'
            }`}
          />
          <span className="text-[10px] hidden xs:inline text-slate-500 font-mono">
            {wsConnected ? 'Live' : 'Polling'}
          </span>
        </div>

        {/* Upload Shortcut */}
        <button
          onClick={() => setActiveTab('upload')}
          className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors border border-slate-800/60"
          title="Upload new PDF book"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span>Upload</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors border border-slate-800/60"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-300" />
          )}
        </button>
      </div>
    </header>
  );
};
