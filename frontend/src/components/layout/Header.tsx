import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Upload,
  BookOpen,
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
    dashboard: { title: 'Dashboard', subtitle: 'Overview of converted books, metrics and processing queue' },
    upload: { title: 'New Project', subtitle: 'Upload large PDF books, inspect structure and detect chapters' },
    chapters: { title: 'Chapter Review', subtitle: 'Review and refine chapter boundaries before Markdown conversion' },
    queue: { title: 'Processing Queue', subtitle: 'Live conversion progress, stage monitoring and execution logs' },
    markdown: { title: 'Markdown Studio', subtitle: 'Rendered preview, side-by-side view and live chapter editing' },
    audit: { title: 'Quality & Diagnostics Audit', subtitle: 'Automated verification of broken images, malformed tables, short chapters and encoding' },
    export: { title: 'Export & Download', subtitle: 'Structured ZIP bundles, standalone Markdown and book metadata' },
    library: { title: 'My Library', subtitle: 'Manage, re-convert, duplicate and browse your book collection' },
    history: { title: 'Conversion History', subtitle: 'Past batch jobs, performance metrics and audit logs' },
    settings: { title: 'Studio Settings', subtitle: 'Fine-tune PyMuPDF4LLM engine, image extraction, tables & OCR' },
    help: { title: 'Help & Documentation', subtitle: 'Detection methods guide, OCR troubleshooting and architecture' },
  };

  const current = titles[activeTab] || { title: 'Studio', subtitle: '' };

  return (
    <header className="h-16 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{current.title}</h2>
            {activeProject && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                <BookOpen className="w-3 h-3 text-indigo-400" />
                <span className="max-w-[180px] truncate">{activeProject.title}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">{current.subtitle}</p>
        </div>
      </div>

      {/* Right: Status Indicators & Quick Actions */}
      <div className="flex items-center space-x-3">
        {/* Real-time WS connection pill */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            wsConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}
          title={wsConnected ? 'Connected to live event stream' : 'Reconnecting to live event stream...'}
        >
          {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3 animate-pulse" />}
          <span className="hidden xs:inline">{wsConnected ? 'Live' : 'Polling'}</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors border border-slate-800"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Upload Button Shortcut */}
        <button
          onClick={() => setActiveTab('upload')}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:from-indigo-500 hover:to-violet-500 transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Book</span>
        </button>
      </div>
    </header>
  );
};
