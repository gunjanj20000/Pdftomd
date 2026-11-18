import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Zap,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { ConversionJob, ProcessingLog, Project } from '../../types';
import { api } from '../../api/client';

interface ConversionHistoryViewProps {
  jobs: ConversionJob[];
  projects: Project[];
  onSelectProject: (project: Project, tab?: any) => void;
}

export const ConversionHistoryView: React.FC<ConversionHistoryViewProps> = ({
  jobs,
  projects,
  onSelectProject,
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobLogs, setJobLogs] = useState<ProcessingLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  const handleViewLogs = async (jobId: string) => {
    setSelectedJobId(jobId);
    setIsLoadingLogs(true);
    try {
      const logs = await api.getJobLogs(jobId);
      setJobLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const getProjectForJob = (projectId: string) => {
    return projects.find((p) => p.id === projectId);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Conversion Audit History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical log of all document conversion runs, completed batches, and error traces.
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Conversion History Yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Jobs that run will be recorded here with status, duration, and execution logs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Job List (7 cols on lg) */}
          <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-800/80">
            {jobs.map((job) => {
              const project = getProjectForJob(job.project_id);
              const isSelected = selectedJobId === job.id;

              return (
                <div
                  key={job.id}
                  onClick={() => handleViewLogs(job.id)}
                  className={`p-4 transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                    isSelected ? 'bg-indigo-950/20 border-l-2 border-indigo-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize border ${
                          job.status === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : job.status === 'failed' || job.status === 'completed_with_errors'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : job.status === 'running'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {job.status}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {project ? project.title : job.id}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>{job.completed_chapters}/{job.total_chapters} chapters</span>
                      <span>•</span>
                      <span>Speed: {job.speed_pages_per_sec} pages/s</span>
                      <span>•</span>
                      <span>{job.created_at.split('T')[0]}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewLogs(job.id);
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Logs</span>
                    </button>
                    {project && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(project, 'export');
                        }}
                        className="px-2.5 py-1 text-xs rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium"
                      >
                        Export
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Job Logs Panel (5 cols on lg) */}
          <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[520px]">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Audit Logs: {selectedJobId || 'Select a Job'}
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{jobLogs.length} lines</span>
            </div>

            <div className="flex-1 bg-[#080C14] overflow-y-auto p-4 font-mono text-xs space-y-1">
              {isLoadingLogs ? (
                <p className="text-slate-500 text-center py-6">Loading job execution logs...</p>
              ) : jobLogs.length === 0 ? (
                <p className="text-slate-600 text-center py-6">Click a job on the left to inspect its execution logs.</p>
              ) : (
                jobLogs.map((l) => (
                  <div key={l.id} className="text-slate-300">
                    <span className="text-slate-600">[{l.timestamp.split('T')[1]?.slice(0, 8)}]</span>{' '}
                    <span
                      className={
                        l.level === 'ERROR'
                          ? 'text-rose-400 font-bold'
                          : l.level === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-indigo-400'
                      }
                    >
                      [{l.level}]
                    </span>{' '}
                    <span className="text-slate-500">({l.stage}):</span> {l.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
