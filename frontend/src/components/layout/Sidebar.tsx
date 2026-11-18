import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Library,
  BookOpen,
  FileText,
  Download,
  Activity,
  Settings,
  HelpCircle,
  FileDown,
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
  const primaryNavItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload PDF', icon: UploadCloud },
    { id: 'library', label: 'Library', icon: Library },
  ];

  const documentNavItems = [
    { id: 'chapters', label: 'Chapters & PDF Split', icon: BookOpen },
    { id: 'markdown', label: 'Markdown Studio', icon: FileText },
    { id: 'export', label: 'Export Center', icon: Download },
  ];

  const secondaryNavItems = [
    {
      id: 'queue',
      label: 'Activity & Queue',
      icon: Activity,
      badge: activeJobCount > 0 ? activeJobCount : undefined,
    },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-[#0A0E17] border-r border-slate-800/60 flex flex-col justify-between shrink-0 h-screen sticky top-0 hidden md:flex select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Minimalist Brand Header */}
        <div className="px-5 py-4 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white block">
                PDF to MD
              </span>
              <span className="text-[10px] text-slate-500 block -mt-0.5 font-mono">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Nav Area */}
        <div className="p-3 space-y-5 overflow-y-auto flex-1">
          {/* Active Book Card (Minimalist & Compact) */}
          {activeProject ? (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-indigo-500/20 hover:border-indigo-500/30 transition-all">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="uppercase tracking-wider font-semibold text-[10px] text-indigo-400">
                  Active Document
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {activeProject.page_count} pp
                </span>
              </div>
              <p
                className="text-xs font-medium text-slate-200 truncate"
                title={activeProject.title}
              >
                {activeProject.title}
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('chapters')}
                  className={`text-[11px] px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    activeTab === 'chapters'
                      ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title="Review chapters and save as PDF"
                >
                  <FileDown className="w-3 h-3 text-indigo-400" />
                  <span>PDF Split</span>
                </button>
                <button
                  onClick={() => setActiveTab('markdown')}
                  className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                    activeTab === 'markdown'
                      ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  MD View
                </button>
                <button
                  onClick={() => setActiveTab('export')}
                  className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                    activeTab === 'export'
                      ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  Export
                </button>
              </div>
            </div>
          ) : null}

          {/* Primary Nav */}
          <div>
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
              Workspace
            </span>
            <nav className="space-y-0.5">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as NavTab)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-300 font-semibold border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Document Operations Nav */}
          <div>
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
              Document & Chapters
            </span>
            <nav className="space-y-0.5">
              {documentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as NavTab)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-300 font-semibold border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Utility Nav */}
      <div className="p-3 border-t border-slate-800/50 space-y-0.5">
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-300 font-semibold border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
