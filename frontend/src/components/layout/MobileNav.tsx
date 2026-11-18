import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Library,
  Layers,
  Settings,
  X,
  BookOpen,
  FileText,
  Download,
  History,
  HelpCircle,
  ShieldCheck,
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'New Project', icon: PlusCircle },
    { id: 'library', label: 'My Library', icon: Library },
    { id: 'queue', label: 'Processing Queue', icon: Layers, badge: activeJobCount > 0 ? activeJobCount : undefined },
    { id: 'chapters', label: 'Chapter Review', icon: BookOpen },
    { id: 'markdown', label: 'Markdown Studio', icon: FileText },
    { id: 'audit', label: 'Quality Audit', icon: ShieldCheck },
    { id: 'export', label: 'Export & Download', icon: Download },
    { id: 'history', label: 'Conversion History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & About', icon: HelpCircle },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-black/70 backdrop-blur-sm flex">
      <div className="w-4/5 max-w-xs bg-[#0F172A] border-r border-slate-800 h-full flex flex-col justify-between p-4 shadow-2xl">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-white text-sm">PDF to MD Studio</span>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {activeProject && (
            <div className="my-3 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-indigo-400">Current Book</p>
              <p className="text-xs font-semibold text-slate-100 truncate mt-0.5">{activeProject.title}</p>
            </div>
          )}

          <nav className="mt-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
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
          </nav>
        </div>

        <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-500">
          PDF Book to Markdown Studio v1.0
        </div>
      </div>
      <div className="flex-1" onClick={onClose}></div>
    </div>
  );
};
