import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Library,
  Layers,
  Settings,
  X,
  BookOpen,
  FileText,
  Download,
  HelpCircle,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { Project } from '../../types';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeProject: Project | null;
  activeJobCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  activeProject,
  activeJobCount,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload PDF', icon: UploadCloud },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'chapters', label: 'Chapters & PDF Split', icon: BookOpen },
    { id: 'markdown', label: 'Markdown Studio', icon: FileText },
    { id: 'export', label: 'Export Center', icon: Download },
    { id: 'queue', label: 'Activity & Queue', icon: Layers, badge: activeJobCount > 0 ? activeJobCount : undefined },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Docs', icon: HelpCircle },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm flex">
      <div className="w-4/5 max-w-xs bg-[#0A0E17] border-r border-slate-800/80 h-full flex flex-col justify-between p-4 shadow-2xl">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/60">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-white text-sm">PDF to MD</span>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeProject && (
            <div className="my-3 p-2.5 bg-slate-900/60 border border-indigo-500/20 rounded-xl">
              <p className="text-[10px] uppercase font-semibold text-indigo-400">Current Document</p>
              <p className="text-xs font-medium text-slate-200 truncate mt-0.5">{activeProject.title}</p>
            </div>
          )}

          <nav className="mt-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as NavTab);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/10 text-indigo-300 font-semibold border border-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};
