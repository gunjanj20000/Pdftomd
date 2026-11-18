import React, { useState } from 'react';
import { Merge, X } from 'lucide-react';
import { Chapter } from '../../types';

interface ChapterMergeModalProps {
  selectedChapters: Chapter[];
  onClose: () => void;
  onMerge: (mergedTitle: string) => void;
}

export const ChapterMergeModal: React.FC<ChapterMergeModalProps> = ({
  selectedChapters,
  onClose,
  onMerge,
}) => {
  const [mergedTitle, setMergedTitle] = useState<string>(
    selectedChapters.length > 0 ? selectedChapters[0].title : 'Combined Chapter'
  );

  const startP = Math.min(...selectedChapters.map((c) => c.start_page));
  const endP = Math.max(...selectedChapters.map((c) => c.end_page));
  const totalP = endP - startP + 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onMerge(mergedTitle);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Merge className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Merge {selectedChapters.length} Chapters</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-300">
            Merging {selectedChapters.length} chapters will create a single chapter covering pages{' '}
            <span className="font-semibold text-white">{startP} to {endP}</span> ({totalP} pages).
          </p>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1 max-h-36 overflow-y-auto">
            {selectedChapters.map((c) => (
              <div key={c.id} className="text-[11px] text-slate-300 flex justify-between">
                <span>Ch. {c.chapter_num}: {c.title}</span>
                <span className="text-slate-400">pp. {c.start_page}–{c.end_page}</span>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Title for Merged Chapter:
            </label>
            <input
              type="text"
              value={mergedTitle}
              onChange={(e) => setMergedTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

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
              Confirm Merge
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
