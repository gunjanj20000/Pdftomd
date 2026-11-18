import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Table,
  Zap,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Sliders,
} from 'lucide-react';
import { Chapter, Project, QualityAuditReport } from '../../types';
import { api } from '../../api/client';
import { NavTab } from '../layout/Sidebar';

interface QualityAuditViewProps {
  project: Project;
  chapters: Chapter[];
  onNavigate: (tab: NavTab) => void;
  onRefreshChapters: () => void;
}

export const QualityAuditView: React.FC<QualityAuditViewProps> = ({
  project,
  chapters,
  onNavigate,
  onRefreshChapters,
}) => {
  const [report, setReport] = useState<QualityAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'ERROR' | 'WARNING'>('ALL');
  const [reconvertingId, setReconvertingId] = useState<string | null>(null);
  const [customTableFormat, setCustomTableFormat] = useState<'markdown' | 'html'>('markdown');
  const [customEnableOcr, setCustomEnableOcr] = useState<boolean>(false);
  const [activeOptionsChapterId, setActiveOptionsChapterId] = useState<string | null>(null);

  const fetchAudit = async () => {
    setIsLoading(true);
    try {
      const data = await api.getQualityAudit(project.id);
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [project.id]);

  const handleSelectiveReconvert = async (chapterId: string) => {
    setReconvertingId(chapterId);
    try {
      await api.reconvertChapter(project.id, chapterId, {
        table_format: customTableFormat,
        enable_ocr: customEnableOcr,
      });
      onRefreshChapters();
      await fetchAudit();
      setActiveOptionsChapterId(null);
    } catch (err: any) {
      alert(`Reconversion failed: ${err.message}`);
    } finally {
      setReconvertingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white">Running Document Health Diagnostics...</h3>
        <p className="text-xs text-slate-400 mt-1">
          Inspecting empty pages, verifying image references, validating table structures and syntax...
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
        <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white">No Audit Data Available</h3>
        <button
          onClick={fetchAudit}
          className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
        >
          Run Quality Audit
        </button>
      </div>
    );
  }

  const isHealthy = report.overall_score >= 85;

  return (
    <div className="space-y-6">
      {/* Top Banner & Health Score */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                isHealthy
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {isHealthy ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Document Quality Audit: {project.title}
                </h2>
                <span
                  className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    isHealthy
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {report.health_status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Automated validation of image references, table column alignments, page emptiness, and heading syntax.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Health Score</span>
              <p
                className={`text-2xl font-black ${
                  report.overall_score >= 90
                    ? 'text-emerald-400'
                    : report.overall_score >= 70
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {report.overall_score}/100
              </p>
            </div>

            <button
              onClick={fetchAudit}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Re-run Diagnostic Audit"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Issues</span>
            <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              {report.total_errors + report.total_warnings === 0 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 0 Issues
                </span>
              ) : (
                <>
                  {report.total_errors > 0 && (
                    <span className="text-rose-400 font-mono">{report.total_errors} errors</span>
                  )}
                  {report.total_warnings > 0 && (
                    <span className="text-amber-400 font-mono">{report.total_warnings} warnings</span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Verified Figures</span>
            <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
              {report.total_images_verified} images
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Verified Tables</span>
            <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              {report.total_tables_verified} tables
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Semantic Tokens</span>
            <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              ~{report.estimated_tokens.toLocaleString()} tokens
            </p>
          </div>
        </div>
      </div>

      {/* Chapters Quality Review List */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Chapter Health Breakdown</h3>
          </div>

          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterSeverity('ALL')}
              className={`px-2.5 py-1 rounded font-medium ${
                filterSeverity === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({report.chapters.length})
            </button>
            <button
              onClick={() => setFilterSeverity('ERROR')}
              className={`px-2.5 py-1 rounded font-medium ${
                filterSeverity === 'ERROR' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Errors Only
            </button>
            <button
              onClick={() => setFilterSeverity('WARNING')}
              className={`px-2.5 py-1 rounded font-medium ${
                filterSeverity === 'WARNING' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Warnings
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {report.chapters.map((ch) => {
            const hasErrors = ch.issues.some((i) => i.severity === 'ERROR');
            const hasWarnings = ch.issues.some((i) => i.severity === 'WARNING');
            const isReconverting = reconvertingId === ch.chapter_id;
            const showOptions = activeOptionsChapterId === ch.chapter_id;

            if (filterSeverity === 'ERROR' && !hasErrors) return null;
            if (filterSeverity === 'WARNING' && !hasWarnings && !hasErrors) return null;

            return (
              <div key={ch.chapter_id} className="p-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-500 shrink-0 mt-0.5 w-6">
                      {ch.chapter_num}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">{ch.title}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            ch.score >= 90
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : ch.score >= 70
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          Score: {ch.score}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {ch.word_count} words • {ch.image_count} figures • {ch.table_count} tables
                      </p>
                    </div>
                  </div>

                  {/* Selective Reconversion Controls */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() =>
                        setActiveOptionsChapterId(showOptions ? null : ch.chapter_id)
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3 text-slate-400" />
                      <span>Options</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                      onClick={() => handleSelectiveReconvert(ch.chapter_id)}
                      disabled={isReconverting}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isReconverting ? 'animate-spin' : ''}`} />
                      <span>{isReconverting ? 'Reconverting...' : 'Selective Reconvert'}</span>
                    </button>

                    <button
                      onClick={() => onNavigate('markdown')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Open in Markdown Studio"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reconversion Customization Dropdown Panel */}
                {showOptions && (
                  <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Table Rendering Mode for this Chapter:
                      </label>
                      <select
                        value={customTableFormat}
                        onChange={(e) => setCustomTableFormat(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200"
                      >
                        <option value="markdown">Markdown Tables (| Col | Col |)</option>
                        <option value="html">Rich HTML Tables (&lt;table&gt;)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customEnableOcr}
                          onChange={(e) => setCustomEnableOcr(e.target.checked)}
                          className="w-4 h-4 accent-indigo-600 rounded"
                        />
                        <span className="text-slate-300 font-medium">Enable Tesseract OCR for this chapter</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Issues List for this Chapter */}
                {ch.issues.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {ch.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs flex items-start space-x-2 ${
                          issue.severity === 'ERROR'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        }`}
                      >
                        {issue.severity === 'ERROR' ? (
                          <XCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold">{issue.message}</p>
                          {issue.snippet && (
                            <pre className="mt-1 font-mono text-[11px] bg-black/40 p-1.5 rounded text-slate-300 overflow-x-auto">
                              {issue.snippet}
                            </pre>
                          )}
                          {issue.suggestion && (
                            <p className="text-[11px] opacity-80 mt-1 italic">
                              Fix: {issue.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
