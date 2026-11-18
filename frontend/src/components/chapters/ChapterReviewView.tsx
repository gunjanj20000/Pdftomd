import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Search,
  Scissors,
  Merge,
  Trash2,
  Plus,
  Eye,
  RefreshCw,
  Play,
  Edit2,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileDown,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Chapter, Project } from '../../types';
import { api } from '../../api/client';
import { ChapterSplitModal } from './ChapterSplitModal';
import { ChapterMergeModal } from './ChapterMergeModal';

interface ChapterReviewViewProps {
  project: Project;
  chapters: Chapter[];
  onRefreshChapters: () => void;
  onStartConversion: () => void;
  onRedetect: () => void;
}

export const ChapterReviewView: React.FC<ChapterReviewViewProps> = ({
  project,
  chapters,
  onRefreshChapters,
  onStartConversion,
  onRedetect,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'num' | 'title' | 'pages'>('num');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selected chapter for side-by-side preview
  const [previewChapter, setPreviewChapter] = useState<Chapter | null>(
    chapters.length > 0 ? chapters[0] : null
  );
  const [previewPage, setPreviewPage] = useState<number>(
    chapters.length > 0 ? chapters[0].start_page : 1
  );

  // Split and Merge modal states
  const [splitTarget, setSplitTarget] = useState<Chapter | null>(null);
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);

  // Inline editing state: chapterId -> { title, start_page, end_page }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editStart, setEditStart] = useState<number>(1);
  const [editEnd, setEditEnd] = useState<number>(1);

  // Selected for batch operations
  const selectedChapters = chapters.filter((c) => c.is_selected);
  const [convertingRowId, setConvertingRowId] = useState<string | null>(null);
  const [isStartingConversion, setIsStartingConversion] = useState<boolean>(false);

  const handleStartConversionClick = async () => {
    if (isStartingConversion || selectedChapters.length === 0) return;
    setIsStartingConversion(true);
    try {
      await onStartConversion();
    } finally {
      setIsStartingConversion(false);
    }
  };

  const handleConvertSingleRow = async (c: Chapter) => {
    setConvertingRowId(c.id);
    try {
      await api.reconvertChapter(project.id, c.id);
      onRefreshChapters();
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setConvertingRowId(null);
    }
  };

  const handleSelectAll = async (select: boolean) => {
    try {
      await Promise.all(
        chapters.map((c) =>
          api.updateChapter(project.id, c.id, { is_selected: select })
        )
      );
      onRefreshChapters();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSelect = async (chapter: Chapter) => {
    try {
      await api.updateChapter(project.id, chapter.id, {
        is_selected: !chapter.is_selected,
      });
      onRefreshChapters();
    } catch (e) {
      console.error(e);
    }
  };

  const startInlineEdit = (c: Chapter) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditStart(c.start_page);
    setEditEnd(c.end_page);
  };

  const saveInlineEdit = async (chapterId: string) => {
    try {
      await api.updateChapter(project.id, chapterId, {
        title: editTitle,
        start_page: editStart,
        end_page: editEnd,
      });
      setEditingId(null);
      onRefreshChapters();
    } catch (e: any) {
      alert(e.message || 'Error updating chapter');
    }
  };

  const handleDelete = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;
    try {
      await api.deleteChapter(project.id, chapterId);
      onRefreshChapters();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSplitConfirm = async (
    splitPage: number,
    firstTitle?: string,
    secondTitle?: string
  ) => {
    if (!splitTarget) return;
    try {
      await api.splitChapter(project.id, splitTarget.id, splitPage, firstTitle, secondTitle);
      setSplitTarget(null);
      onRefreshChapters();
    } catch (e: any) {
      alert(e.message || 'Split failed');
    }
  };

  const handleMergeConfirm = async (mergedTitle: string) => {
    const ids = selectedChapters.map((c) => c.id);
    try {
      await api.mergeChapters(project.id, ids, mergedTitle);
      setShowMergeModal(false);
      onRefreshChapters();
    } catch (e: any) {
      alert(e.message || 'Merge failed');
    }
  };

  const handleAddManualChapter = async () => {
    const nextNum = chapters.length + 1;
    const lastChapter = chapters[chapters.length - 1];
    const startP = lastChapter ? Math.min(project.page_count, lastChapter.end_page + 1) : 1;
    const endP = project.page_count;

    try {
      await api.addChapter(project.id, {
        chapter_num: nextNum,
        title: `Chapter ${nextNum}`,
        start_page: startP,
        end_page: endP,
        level: 1,
        detection_method: 'manual',
        is_selected: true,
      });
      onRefreshChapters();
    } catch (e: any) {
      alert(e.message || 'Error adding chapter');
    }
  };

  const selectForPreview = (c: Chapter) => {
    setPreviewChapter(c);
    setPreviewPage(c.start_page);
  };

  // Filter and sort chapters
  const filteredChapters = chapters
    .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'num') cmp = a.chapter_num - b.chapter_num;
      else if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortBy === 'pages') cmp = a.page_count - b.page_count;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Minimalist Top Control Bar */}
      <div className="bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
              {project.title}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {chapters.length} chapters identified • {project.page_count} total pages • Save chapters as separate PDFs or convert to Markdown.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Option to Save All Chapters as PDF (ZIP) */}
          <a
            href={api.getChaptersPdfZipUrl(project.id)}
            download
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 transition-all shadow-sm cursor-pointer"
            title="Slice and download all chapters as separate authentic PDF files"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>Save Chapters as PDF</span>
          </a>

          {/* Convert to Markdown */}
          <button
            onClick={handleStartConversionClick}
            disabled={selectedChapters.length === 0 || isStartingConversion}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-sm transition-all cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-white ${isStartingConversion ? 'animate-pulse' : ''}`} />
            <span>{isStartingConversion ? 'Converting...' : `Convert to MD (${selectedChapters.length})`}</span>
          </button>

          {/* Secondary Tools */}
          <button
            onClick={onRedetect}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
            title="Re-run chapter detection"
          >
            <RefreshCw className="w-3 h-3 text-slate-400" />
            <span>Re-detect</span>
          </button>

          <button
            onClick={handleAddManualChapter}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
            title="Add a manual chapter boundary"
          >
            <Plus className="w-3 h-3 text-slate-400" />
            <span>Add Chapter</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chapter List on Left, PDF Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Chapters Table */}
        <div className="lg:col-span-7 bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {/* Minimalist Toolbar */}
          <div className="px-4 py-3 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3 bg-slate-900/30">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSelectAll(selectedChapters.length !== chapters.length)}
                className="p-1 text-slate-400 hover:text-white rounded-md flex items-center gap-1.5 text-xs font-medium"
              >
                {selectedChapters.length === chapters.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>
                  {selectedChapters.length}/{chapters.length} Selected
                </span>
              </button>

              {selectedChapters.length >= 2 && (
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 flex items-center gap-1"
                >
                  <Merge className="w-3 h-3" />
                  <span>Merge ({selectedChapters.length})</span>
                </button>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
              />
            </div>
          </div>

          {/* Chapters Rows */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto divide-y divide-slate-800/50">
            {filteredChapters.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No chapters found. Click "Add Chapter" or "Re-detect".
              </div>
            ) : (
              filteredChapters.map((c) => {
                const isEditing = editingId === c.id;
                const isCurrentPreview = previewChapter?.id === c.id;

                return (
                  <div
                    key={c.id}
                    className={`p-3 transition-colors flex items-center justify-between gap-3 ${
                      isCurrentPreview
                        ? 'bg-indigo-950/20 border-l-2 border-indigo-500'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Left: Checkbox & Chapter Details */}
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <button
                        onClick={() => handleToggleSelect(c)}
                        className="text-slate-500 hover:text-white shrink-0"
                      >
                        {c.is_selected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <span className="text-[11px] font-mono text-slate-500 shrink-0 w-6">
                        {String(c.chapter_num).padStart(2, '0')}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-xs text-white rounded px-2 py-1 flex-1"
                          />
                          <input
                            type="number"
                            value={editStart}
                            onChange={(e) => setEditStart(parseInt(e.target.value) || 1)}
                            className="bg-slate-950 border border-slate-700 text-xs text-white rounded w-14 px-1 py-1 text-center font-mono"
                          />
                          <span className="text-slate-600">-</span>
                          <input
                            type="number"
                            value={editEnd}
                            onChange={(e) => setEditEnd(parseInt(e.target.value) || 1)}
                            className="bg-slate-950 border border-slate-700 text-xs text-white rounded w-14 px-1 py-1 text-center font-mono"
                          />
                          <button
                            onClick={() => saveInlineEdit(c.id)}
                            className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => selectForPreview(c)}
                        >
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-slate-200 truncate hover:text-indigo-300 transition-colors">
                              {c.title}
                            </p>
                            {c.status === 'completed' && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10">
                                MD
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
                            <span>pp. {c.start_page}–{c.end_page}</span>
                            <span>•</span>
                            <span>{c.page_count} pages</span>
                            <span className="text-slate-600 capitalize">({c.detection_method})</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    {!isEditing && (
                      <div className="flex items-center space-x-1 shrink-0">
                        {/* Direct Save Chapter as PDF */}
                        <a
                          href={api.getChapterPdfUrl(project.id, c.id)}
                          download
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                          title={`Save Chapter ${c.chapter_num} as PDF (${c.page_count} pp.)`}
                        >
                          <FileDown className="w-3 h-3 text-indigo-400" />
                          <span>PDF</span>
                        </a>

                        {/* Convert to Markdown */}
                        <button
                          onClick={() => handleConvertSingleRow(c)}
                          disabled={convertingRowId === c.id}
                          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                          title="Convert Chapter to Markdown"
                        >
                          {convertingRowId === c.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          ) : c.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-400" />
                          )}
                        </button>

                        {/* Preview */}
                        <button
                          onClick={() => selectForPreview(c)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="Preview First Page"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Boundaries */}
                        <button
                          onClick={() => startInlineEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="Edit Title & Boundaries"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Split */}
                        <button
                          onClick={() => setSplitTarget(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Split Chapter"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Delete Chapter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Minimalist Side-by-Side PDF Page Previewer */}
        <div className="lg:col-span-5 bg-[#0E131F]/90 border border-slate-800/70 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[650px]">
          {/* Header */}
          <div className="p-3 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/30">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 block font-mono">
                {previewChapter ? `Chapter ${previewChapter.chapter_num}` : 'Preview'}
              </span>
              <p className="text-xs font-medium text-white truncate max-w-[200px]">
                {previewChapter ? previewChapter.title : 'Select a chapter'}
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {previewChapter && (
                <a
                  href={api.getChapterPdfUrl(project.id, previewChapter.id)}
                  download
                  className="inline-flex items-center space-x-1 px-2 py-1 text-[10px] font-medium rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20"
                  title="Save this chapter as PDF"
                >
                  <FileDown className="w-3 h-3 text-indigo-400" />
                  <span>Save PDF</span>
                </a>
              )}

              {/* Stepper */}
              <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 px-1.5">
                  {previewPage} / {project.page_count}
                </span>
                <button
                  disabled={previewPage >= project.page_count}
                  onClick={() => setPreviewPage((p) => Math.min(project.page_count, p + 1))}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Rendered Preview Image */}
          <div className="flex-1 bg-[#070A10] overflow-auto flex items-center justify-center p-3">
            <img
              key={`${project.id}_${previewPage}`}
              src={api.getPagePreviewUrl(project.id, previewPage, 130)}
              alt={`Page ${previewPage}`}
              className="max-h-[560px] w-auto object-contain rounded-lg shadow-lg border border-slate-800/80"
            />
          </div>
        </div>
      </div>

      {/* Split Modal */}
      {splitTarget && (
        <ChapterSplitModal
          chapter={splitTarget}
          onClose={() => setSplitTarget(null)}
          onSplit={handleSplitConfirm}
        />
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <ChapterMergeModal
          selectedChapters={selectedChapters}
          onClose={() => setShowMergeModal(false)}
          onMerge={handleMergeConfirm}
        />
      )}
    </div>
  );
};
