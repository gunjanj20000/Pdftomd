import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Library,
  Layers,
  History,
  Settings,
  HelpCircle,
  FileText,
  Download,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { Project } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'upload'
  | 'chapters'
  | 'queue'
  | 'markdown'
  | 'audit'
  | 'export'
  | 'library'
  | 'history'
  | 'settings'
  | 'help';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeProject: Project | null;
  activeJobCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeProject,
  activeJobCount,
}) => {
  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'New Project', icon: PlusCircle },
    { id: 'library', label: 'My Library', icon: Library },
    {
      id: 'queue',
      label: 'Processing Queue',
      icon: Layers,
      badge: activeJobCount > 0 ? activeJobCount : undefined,
    },
    { id: 'history', label: 'Conversion History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & About', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 hidden md:flex">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              PDF to MD
              <span className="text-[10px] font-semibold uppercase bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                Studio
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">PyMuPDF4LLM Engine</p>
          </div>
        </div>

        {/* Active Project Card (if any) */}
        {activeProject && (
          <div className="p-3 mx-3 my-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl">
            <div className="flex items-center justify-between text-[11px] font-medium text-indigo-300 mb-1">
              <span className="truncate uppercase tracking-wider font-semibold">Active Book</span>
              <span className="text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-300">
                {activeProject.page_count} pp.
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-100 truncate" title={activeProject.title}>
              {activeProject.title}
            </p>
            <div className="mt-2.5 pt-2 border-t border-indigo-900/50 flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('chapters')}
                className={`text-[11px] px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeTab === 'chapters'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-indigo-200 hover:bg-indigo-900/40'
                }`}
              >
                Chapters
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={`text-[11px] px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeTab === 'markdown'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-indigo-200 hover:bg-indigo-900/40'
                }`}
              >
                Markdown
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`text-[11px] px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeTab === 'audit'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-indigo-200 hover:bg-indigo-900/40'
                }`}
              >
                Audit
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`text-[11px] px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeTab === 'export'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-indigo-200 hover:bg-indigo-900/40'
                }`}
              >
                Export
              </button>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[11px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-500">Backend Engine</span>
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Online
          </span>
        </div>
        <p className="text-[11px] text-slate-400 truncate">PyMuPDF 2.0 • Tesseract OCR</p>
      </div>
    </aside>
  );
};
