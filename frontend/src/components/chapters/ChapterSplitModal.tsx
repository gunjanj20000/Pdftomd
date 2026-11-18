import React, { useState } from 'react';
import { Scissors, X } from 'lucide-react';
import { Chapter } from '../../types';

interface ChapterSplitModalProps {
  chapter: Chapter;
  onClose: () => void;
  onSplit: (splitPage: number, firstTitle?: string, secondTitle?: string) => void;
}

export const ChapterSplitModal: React.FC<ChapterSplitModalProps> = ({
  chapter,
  onClose,
  onSplit,
}) => {
  const [splitPage, setSplitPage] = useState<number>(
    Math.floor((chapter.start_page + chapter.end_page) / 2)
  );
  const [firstTitle, setFirstTitle] = useState<string>(`${chapter.title} (Part 1)`);
  const [secondTitle, setSecondTitle] = useState<string>(`${chapter.title} (Part 2)`);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (splitPage <= chapter.start_page || splitPage > chapter.end_page) {
      setError(`Split page must be between ${chapter.start_page + 1} and ${chapter.end_page}`);
      return;
    }
    onSplit(splitPage, firstTitle, secondTitle);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scissors className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Split Chapter {chapter.chapter_num}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-300">
            Current range: <span className="font-semibold text-white">Page {chapter.start_page} to {chapter.end_page}</span> ({chapter.page_count} pages).
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Split at Page (Start of Second Part):
            </label>
            <input
              type="number"
              min={chapter.start_page + 1}
              max={chapter.end_page}
              value={splitPage}
              onChange={(e) => setSplitPage(parseInt(e.target.value) || chapter.start_page + 1)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Part 1 will cover pp. {chapter.start_page}–{splitPage - 1}. Part 2 will cover pp. {splitPage}–{chapter.end_page}.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Part 1 Title:</label>
            <input
              type="text"
              value={firstTitle}
              onChange={(e) => setFirstTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Part 2 Title:</label>
            <input
              type="text"
              value={secondTitle}
              onChange={(e) => setSecondTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Confirm Split
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
