import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Search,
  ArrowUpDown,
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
  Sparkles,
  CheckCircle2,
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

  // Selected for batch merge/delete
  const selectedChapters = chapters.filter((c) => c.is_selected);
  const [convertingRowId, setConvertingRowId] = useState<string | null>(null);

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

  const handleSplitConfirm = async (splitPage: number, firstTitle?: string, secondTitle?: string) => {
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
    <div className="space-y-6">
      {/* Top action header */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Chapter Review: {project.title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {chapters.length} chapters identified. Verify page ranges, rename, merge or split before conversion.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRedetect}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-detect</span>
          </button>
          <button
            onClick={handleAddManualChapter}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Chapter</span>
          </button>
          <button
            onClick={onStartConversion}
            disabled={selectedChapters.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Convert {selectedChapters.length} Chapters</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid: Table on Left, PDF Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chapters Table (7 cols on lg, full on sm) */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {/* Table Toolbar */}
          <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSelectAll(selectedChapters.length !== chapters.length)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5 text-xs font-medium"
              >
                {selectedChapters.length === chapters.length ? (
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>{selectedChapters.length}/{chapters.length}</span>
              </button>

              {selectedChapters.length >= 2 && (
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 flex items-center gap-1"
                >
                  <Merge className="w-3.5 h-3.5" />
                  <span>Merge ({selectedChapters.length})</span>
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto max-h-[620px] overflow-y-auto divide-y divide-slate-800/80">
            {filteredChapters.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No chapters found. Click "Add Chapter" or "Re-detect".
              </div>
            ) : (
              filteredChapters.map((c) => {
                const isEditing = editingId === c.id;
                const isCurrentPreview = previewChapter?.id === c.id;

                return (
                  <div
                    key={c.id}
                    className={`p-3.5 transition-colors flex items-center justify-between gap-3 ${
                      isCurrentPreview ? 'bg-indigo-950/20' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Left: Checkbox & Info */}
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <button
                        onClick={() => handleToggleSelect(c)}
                        className="text-slate-400 hover:text-white shrink-0"
                      >
                        {c.is_selected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <span className="text-xs font-mono font-bold text-slate-500 shrink-0 w-6">
                        {c.chapter_num}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2 py-1 flex-1"
                          />
                          <input
                            type="number"
                            value={editStart}
                            onChange={(e) => setEditStart(parseInt(e.target.value) || 1)}
                            className="bg-slate-900 border border-slate-700 text-xs text-white rounded w-16 px-1.5 py-1 text-center"
                          />
                          <span className="text-slate-500">-</span>
                          <input
                            type="number"
                            value={editEnd}
                            onChange={(e) => setEditEnd(parseInt(e.target.value) || 1)}
                            className="bg-slate-900 border border-slate-700 text-xs text-white rounded w-16 px-1.5 py-1 text-center"
                          />
                          <button
                            onClick={() => saveInlineEdit(c.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => selectForPreview(c)}
                        >
                          <p className="text-xs font-semibold text-slate-200 truncate hover:text-indigo-400 transition-colors">
                            {c.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Pages {c.start_page}–{c.end_page} ({c.page_count} pp.) • Method: <span className="capitalize">{c.detection_method}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Action Buttons */}
                    {!isEditing && (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleConvertSingleRow(c)}
                          disabled={convertingRowId === c.id}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                          title="Convert Only This Chapter"
                        >
                          {convertingRowId === c.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : c.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                        </button>
                        <button
                          onClick={() => selectForPreview(c)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800"
                          title="Preview Page"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => startInlineEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                          title="Edit Boundaries"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSplitTarget(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800"
                          title="Split Chapter"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
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

        {/* Desktop Side-by-Side PDF Page Previewer (5 cols on lg) */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[680px]">
          {/* Header with Page Stepper */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block">
                {previewChapter ? `Ch. ${previewChapter.chapter_num} Start Page` : 'PDF Preview'}
              </span>
              <p className="text-xs font-semibold text-white truncate max-w-[200px]">
                {previewChapter ? previewChapter.title : 'No chapter selected'}
              </p>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                disabled={previewPage <= 1}
                onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-300 px-2 font-medium">
                {previewPage} / {project.page_count}
              </span>
              <button
                disabled={previewPage >= project.page_count}
                onClick={() => setPreviewPage(p => Math.min(project.page_count, p + 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rendered Preview Page Image */}
          <div className="flex-1 bg-[#0B0F19] overflow-auto flex items-center justify-center p-3">
            <img
              key={`${project.id}_${previewPage}`}
              src={api.getPagePreviewUrl(project.id, previewPage, 130)}
              alt={`Page ${previewPage}`}
              className="max-h-[590px] w-auto object-contain rounded shadow-xl border border-slate-800"
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
