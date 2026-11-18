import React, { useState } from 'react';
import {
  Play,
  Pause,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Zap,
  Terminal,
  AlertTriangle,
  Layers,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import { ConversionJob, ProcessingLog, Project } from '../../types';
import { api } from '../../api/client';

interface ProcessingQueueViewProps {
  activeJob: ConversionJob | null;
  activeProject: Project | null;
  logs: ProcessingLog[];
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetryChapter: (chapterId: string) => void;
}

export const ProcessingQueueView: React.FC<ProcessingQueueViewProps> = ({
  activeJob,
  activeProject,
  logs,
  onPause,
  onResume,
  onCancel,
  onRetryChapter,
}) => {
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState<string>('');

  const stages = [
    'Reading PDF',
    'Analyzing pages',
    'Extracting text',
    'Extracting images',
    'Formatting Markdown',
    'Saving chapter',
    'Validating output',
  ];

  const currentStageIndex = activeJob ? stages.indexOf(activeJob.current_stage) : -1;

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = logFilter === 'ALL' || log.level === logFilter;
    const matchesSearch =
      !logSearch ||
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.stage.toLowerCase().includes(logSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Active Job Progress Card */}
      {activeJob ? (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Top Title & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    activeJob.status === 'running'
                      ? 'bg-emerald-400 animate-ping'
                      : activeJob.status === 'paused'
                      ? 'bg-amber-400'
                      : 'bg-indigo-400'
                  }`}
                />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {activeProject ? activeProject.title : 'Active Conversion Job'}
                </h2>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {activeJob.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Current Chapter: <span className="text-indigo-400 font-semibold">{activeJob.current_chapter_title || 'Preparing...'}</span> • Current Page: <span className="font-mono text-slate-200">{activeJob.current_page || 1}</span>
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              {activeJob.status === 'running' ? (
                <button
                  onClick={onPause}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : activeJob.status === 'paused' ? (
                <button
                  onClick={onResume}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              ) : null}

              {(activeJob.status === 'running' || activeJob.status === 'paused' || activeJob.status === 'queued') && (
                <button
                  onClick={onCancel}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Job</span>
                </button>
              )}
            </div>
          </div>

          {/* Large Progress Bar & Stats */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">
                Completed {activeJob.completed_chapters} of {activeJob.total_chapters} chapters
              </span>
              <span className="text-indigo-400 font-mono text-sm">{activeJob.progress_percent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(2, activeJob.progress_percent)}%` }}
              ></div>
            </div>
          </div>

          {/* Speed & Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Processing Speed</span>
              <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {activeJob.speed_pages_per_sec || 0} pages/s
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Estimated Time Remaining</span>
              <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {activeJob.eta_seconds > 0 ? `${activeJob.eta_seconds}s` : 'Calculating...'}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Stage</span>
              <p className="text-sm font-bold text-white mt-0.5 truncate text-indigo-300">
                {activeJob.current_stage || 'Ready'}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Remaining Chapters</span>
              <p className="text-sm font-bold text-white mt-0.5">
                {Math.max(0, activeJob.total_chapters - activeJob.completed_chapters)}
              </p>
            </div>
          </div>

          {/* 7-Stage Visual Pipeline */}
          <div>
            <h4 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Conversion Stage Pipeline
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5">
              {stages.map((stageName, idx) => {
                const isPassed = currentStageIndex > idx || activeJob.status === 'completed';
                const isCurrent = currentStageIndex === idx && activeJob.status === 'running';

                return (
                  <div
                    key={stageName}
                    className={`p-2 rounded-xl text-center border text-[11px] font-medium transition-all ${
                      isCurrent
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold shadow-sm'
                        : isPassed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="block text-[10px] opacity-60">Step {idx + 1}</span>
                    <span className="truncate block mt-0.5">{stageName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Active Conversion Jobs</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Select a project from My Library or upload a new PDF book, review the chapters, and click "Convert".
          </p>
        </div>
      )}

      {/* Live Terminal Execution Logs */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Live Execution Logs</h3>
            <span className="text-[11px] font-mono text-slate-500">({logs.length} entries)</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search within logs */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Severity filter */}
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
        </div>

        {/* Console Body */}
        <div className="p-4 bg-[#080C14] font-mono text-xs max-h-80 overflow-y-auto space-y-1.5 selection:bg-indigo-900">
          {filteredLogs.length === 0 ? (
            <p className="text-slate-600 text-center py-4">No log records recorded yet.</p>
          ) : (
            filteredLogs.map((log) => {
              const isError = log.level === 'ERROR';
              const isWarning = log.level === 'WARNING';
              const time = log.timestamp.split('T')[1]?.split('.')[0] || log.timestamp;

              return (
                <div key={log.id} className="flex items-start space-x-2">
                  <span className="text-slate-600 shrink-0 select-none">[{time}]</span>
                  <span
                    className={`font-bold shrink-0 select-none ${
                      isError ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-indigo-400'
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-slate-500 shrink-0 select-none">({log.stage}):</span>
                  <span
                    className={`break-words ${
                      isError ? 'text-rose-200' : isWarning ? 'text-amber-200' : 'text-slate-300'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
