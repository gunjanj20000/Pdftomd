import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { UploadView } from './components/upload/UploadView';
import { ChapterReviewView } from './components/chapters/ChapterReviewView';
import { ProcessingQueueView } from './components/queue/ProcessingQueueView';
import { MarkdownStudioView } from './components/markdown/MarkdownStudioView';
import { QualityAuditView } from './components/audit/QualityAuditView';
import { ExportView } from './components/export/ExportView';
import { LibraryView } from './components/library/LibraryView';
import { ConversionHistoryView } from './components/history/ConversionHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { HelpView } from './components/help/HelpView';
import { Chapter, ConversionJob, ProcessingLog, Project, SystemStats } from './types';
import { api } from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('studio_theme') as 'dark' | 'light') || 'dark';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Core Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeJob, setActiveJob] = useState<ConversionJob | null>(null);
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);

  // Loading States
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('studio_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Initial Data Fetch
  const refreshProjects = async () => {
    try {
      const list = await api.listProjects();
      setProjects(list);
    } catch (e) {
      console.error('Failed to list projects:', e);
    }
  };

  const refreshStats = async () => {
    try {
      const s = await api.getSystemStats();
      setStats(s);
    } catch (e) {
      console.error('Failed to get stats:', e);
    }
  };

  const refreshJobs = async () => {
    try {
      const jList = await api.listJobs();
      setJobs(jList);
      const active = jList.find((j) => j.status === 'running' || j.status === 'queued' || j.status === 'paused');
      if (active) setActiveJob(active);
    } catch (e) {
      console.error('Failed to get jobs:', e);
    }
  };

  const refreshChapters = async (projectId?: string) => {
    const targetId = projectId || activeProject?.id;
    if (!targetId) return;
    try {
      const chList = await api.getChapters(targetId);
      setChapters(chList);
    } catch (e) {
      console.error('Failed to get chapters:', e);
    }
  };

  const refreshLogs = async (jobId?: string) => {
    const jId = jobId || activeJob?.id;
    if (!jId) return;
    try {
      const logList = await api.getJobLogs(jId);
      setLogs(logList);
    } catch (e) {
      console.error('Failed to get logs:', e);
    }
  };

  useEffect(() => {
    refreshProjects();
    refreshStats();
    refreshJobs();
  }, []);

  // When activeProject changes, refresh chapters
  useEffect(() => {
    if (activeProject) {
      refreshChapters(activeProject.id);
    }
  }, [activeProject]);

  // WebSocket for Live Real-Time Events
  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimeout: any;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'log') {
              setLogs((prev) => [msg.data, ...prev.slice(0, 300)]);
            } else if (msg.event === 'job_progress') {
              setActiveJob((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  status: 'running',
                  current_chapter_id: msg.data.chapter_id || prev.current_chapter_id,
                  current_chapter_title: msg.data.current_chapter_title || prev.current_chapter_title,
                  current_page: msg.data.current_page || prev.current_page,
                  current_stage: msg.data.current_stage || prev.current_stage,
                  speed_pages_per_sec: msg.data.speed_pages_per_sec ?? prev.speed_pages_per_sec,
                  progress_percent: msg.data.progress_percent ?? prev.progress_percent,
                  eta_seconds: msg.data.eta_seconds ?? prev.eta_seconds,
                  completed_chapters: msg.data.completed_chapters ?? prev.completed_chapters,
                  total_chapters: msg.data.total_chapters ?? prev.total_chapters,
                };
              });
            } else if (msg.event === 'chapter_completed') {
              if (activeProject) refreshChapters(activeProject.id);
              refreshJobs();
              refreshStats();
            } else if (msg.event === 'job_completed' || msg.event === 'job_failed') {
              refreshJobs();
              refreshProjects();
              refreshStats();
              if (activeProject) refreshChapters(activeProject.id);
            }
          } catch (_) {}
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = () => {
          setWsConnected(false);
        };
      } catch (err) {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, [activeProject]);

  // Polling fallback when a job is active to guarantee UI updates
  useEffect(() => {
    if (!activeJob || (activeJob.status !== 'running' && activeJob.status !== 'queued')) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const freshJob = await api.getJob(activeJob.id);
        setActiveJob(freshJob);
        if (
          freshJob.status === 'completed' ||
          freshJob.status === 'completed_with_errors' ||
          freshJob.status === 'failed'
        ) {
          refreshProjects();
          refreshStats();
          if (activeProject) refreshChapters(activeProject.id);
        }
      } catch (_) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status, activeProject]);

  // Actions
  const handleSelectProject = (project: Project, tab: NavTab = 'chapters') => {
    setActiveProject(project);
    setActiveTab(tab);
  };

  const handleFileDrop = async (files: FileList | File[]) => {
    setActiveTab('upload');
    const fileArray = Array.from(files);
    try {
      const uploaded = await api.uploadPdfs(fileArray);
      if (uploaded && uploaded.length > 0) {
        setActiveProject(uploaded[0]);
        refreshProjects();
        refreshStats();
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    }
  };

  const handleDetectChapters = async (method: string, maxLevel?: number) => {
    if (!activeProject) return;
    setIsDetecting(true);
    try {
      const detected = await api.detectChapters(activeProject.id, {
        method,
        max_level: maxLevel,
      });
      setChapters(detected);
      setActiveTab('chapters');
      refreshProjects();
    } catch (err: any) {
      alert(`Detection failed: ${err.message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.deleteProject(projectId);
      if (activeProject?.id === projectId) {
        setActiveProject(null);
        setChapters([]);
      }
      refreshProjects();
      refreshStats();
      setActiveTab('dashboard');
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const handleStartConversion = async () => {
    if (!activeProject) return;
    try {
      const job = await api.startConversion(activeProject.id);
      setActiveJob(job);
      setActiveTab('queue');
      refreshJobs();
      refreshStats();
      refreshLogs(job.id);
    } catch (err: any) {
      alert(`Conversion start failed: ${err.message}`);
    }
  };

  const handlePauseJob = async () => {
    if (!activeJob) return;
    try {
      await api.pauseJob(activeJob.id);
      refreshJobs();
    } catch (e: any) {
      alert(`Pause failed: ${e.message}`);
    }
  };

  const handleResumeJob = async () => {
    if (!activeJob) return;
    try {
      await api.resumeJob(activeJob.id);
      refreshJobs();
    } catch (e: any) {
      alert(`Resume failed: ${e.message}`);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJob) return;
    if (!confirm('Are you sure you want to cancel this conversion job?')) return;
    try {
      await api.cancelJob(activeJob.id);
      refreshJobs();
    } catch (e: any) {
      alert(`Cancel failed: ${e.message}`);
    }
  };

  const handleRetryChapter = async (chapterId: string) => {
    if (!activeProject) return;
    try {
      const res = await api.retryChapter(activeProject.id, chapterId);
      refreshChapters(activeProject.id);
      refreshJobs();
      setActiveTab('queue');
    } catch (e: any) {
      alert(`Retry failed: ${e.message}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProject={activeProject}
        activeJobCount={stats ? stats.active_jobs : 0}
      />

      {/* Mobile Drawer Menu */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProject={activeProject}
        activeJobCount={stats ? stats.active_jobs : 0}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeProject={activeProject}
          wsConnected={wsConnected}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              recentProjects={projects}
              onSelectProject={handleSelectProject}
              onNavigate={setActiveTab}
              onFileDrop={handleFileDrop}
            />
          )}

          {activeTab === 'upload' && (
            <UploadView
              activeProject={activeProject}
              onProjectReady={(proj) => {
                setActiveProject(proj);
                refreshProjects();
                refreshStats();
              }}
              onDetectChapters={handleDetectChapters}
              onDeleteProject={handleDeleteProject}
              isDetecting={isDetecting}
            />
          )}

          {activeTab === 'chapters' && activeProject && (
            <ChapterReviewView
              project={activeProject}
              chapters={chapters}
              onRefreshChapters={() => refreshChapters(activeProject.id)}
              onStartConversion={handleStartConversion}
              onRedetect={() => handleDetectChapters('bookmarks')}
            />
          )}

          {activeTab === 'chapters' && !activeProject && (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
              <h3 className="text-base font-bold text-white">No Active Book Selected</h3>
              <p className="text-xs text-slate-400 mt-1">
                Please upload a PDF book or select one from My Library to review chapters.
              </p>
              <button
                onClick={() => setActiveTab('upload')}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
              >
                Upload PDF Book
              </button>
            </div>
          )}

          {activeTab === 'queue' && (
            <ProcessingQueueView
              activeJob={activeJob}
              activeProject={activeProject}
              logs={logs}
              onPause={handlePauseJob}
              onResume={handleResumeJob}
              onCancel={handleCancelJob}
              onRetryChapter={handleRetryChapter}
            />
          )}

          {activeTab === 'markdown' && activeProject && (
            <MarkdownStudioView project={activeProject} chapters={chapters} />
          )}

          {activeTab === 'markdown' && !activeProject && (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
              <h3 className="text-base font-bold text-white">No Active Book Selected</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a book with converted chapters from My Library to open the Markdown Studio.
              </p>
            </div>
          )}

          {activeTab === 'audit' && activeProject && (
            <QualityAuditView
              project={activeProject}
              chapters={chapters}
              onNavigate={setActiveTab}
              onRefreshChapters={() => refreshChapters(activeProject.id)}
            />
          )}

          {activeTab === 'audit' && !activeProject && (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
              <h3 className="text-base font-bold text-white">No Active Book Selected</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a converted book from My Library to run Document Quality & Health Diagnostics.
              </p>
            </div>
          )}

          {activeTab === 'export' && activeProject && (
            <ExportView project={activeProject} chapters={chapters} />
          )}

          {activeTab === 'export' && !activeProject && (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
              <h3 className="text-base font-bold text-white">No Active Book Selected</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a book from My Library to export its Markdown and ZIP packages.
              </p>
            </div>
          )}

          {activeTab === 'library' && (
            <LibraryView
              projects={projects}
              onSelectProject={handleSelectProject}
              onRefreshProjects={() => {
                refreshProjects();
                refreshStats();
              }}
            />
          )}

          {activeTab === 'history' && (
            <ConversionHistoryView
              jobs={jobs}
              projects={projects}
              onSelectProject={handleSelectProject}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView stats={stats} onRefreshStats={refreshStats} />
          )}

          {activeTab === 'help' && <HelpView />}
        </main>
      </div>
    </div>
  );
};
