import React, { useState, useEffect } from 'react';
import {
  FileText,
  Eye,
  Code,
  Columns,
  Save,
  Copy,
  Download,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Chapter, Project } from '../../types';
import { api } from '../../api/client';

interface MarkdownStudioViewProps {
  project: Project;
  chapters: Chapter[];
}

export const MarkdownStudioView: React.FC<MarkdownStudioViewProps> = ({
  project,
  chapters,
}) => {
  const convertedChapters = chapters.filter((c) => c.status === 'completed' || c.markdown_path);

  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    convertedChapters.length > 0 ? convertedChapters[0].id : ''
  );

  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'preview' | 'source' | 'split'>('split');
  const [searchWord, setSearchWord] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isReconverting, setIsReconverting] = useState<boolean>(false);
  const [showReconvertMenu, setShowReconvertMenu] = useState<boolean>(false);

  const handleSelectiveReconvert = async (tableFormat: 'markdown' | 'html', enableOcr: boolean) => {
    if (!selectedChapterId) return;
    setIsReconverting(true);
    setSaveStatus(null);
    setShowReconvertMenu(false);
    try {
      await api.reconvertChapter(project.id, selectedChapterId, {
        table_format: tableFormat,
        enable_ocr: enableOcr,
      });
      const data = await api.getChapterMarkdown(project.id, selectedChapterId);
      setMarkdownContent(data.content);
      setOriginalContent(data.content);
      setSaveStatus('Chapter selectively reconverted!');
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: any) {
      alert(`Reconversion failed: ${err.message}`);
    } finally {
      setIsReconverting(false);
    }
  };

  const currentChapter = chapters.find((c) => c.id === selectedChapterId);

  // Fetch chapter markdown when selection changes
  useEffect(() => {
    if (!selectedChapterId) return;

    api
      .getChapterMarkdown(project.id, selectedChapterId)
      .then((data) => {
        setMarkdownContent(data.content);
        setOriginalContent(data.content);
        setSaveStatus(null);
      })
      .catch((err) => {
        setMarkdownContent(`> *Failed to load markdown: ${err.message}*`);
      });
  }, [project.id, selectedChapterId]);

  const handleSave = async () => {
    if (!selectedChapterId) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await api.updateChapterMarkdown(project.id, selectedChapterId, markdownContent);
      setOriginalContent(markdownContent);
      setSaveStatus('Changes saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedChapterId || !currentChapter) return;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentChapter.chapter_num.toString().padStart(3, '0')}_${currentChapter.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrevChapter = () => {
    const idx = convertedChapters.findIndex((c) => c.id === selectedChapterId);
    if (idx > 0) setSelectedChapterId(convertedChapters[idx - 1].id);
  };

  const handleNextChapter = () => {
    const idx = convertedChapters.findIndex((c) => c.id === selectedChapterId);
    if (idx < convertedChapters.length - 1) setSelectedChapterId(convertedChapters[idx + 1].id);
  };

  // Convert image tags to use backend static path: images/xyz.png -> /api/outputs/{project_id}/images/xyz.png
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (key: string) => {
      if (tableRows.length === 0) return null;
      const [header, ...body] = tableRows;
      const cleanHeader = header.filter((c) => c.trim().length > 0 && !c.includes('---'));
      const rendered = (
        <div key={key} className="overflow-x-auto my-4">
          <table className="min-w-full divide-y divide-slate-700 border border-slate-700 text-xs text-left">
            {cleanHeader.length > 0 && (
              <thead className="bg-slate-800 font-semibold text-slate-200">
                <tr>
                  {cleanHeader.map((col, ci) => (
                    <th key={ci} className="px-3 py-2 border-r border-slate-700">
                      {col.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {body
                .filter((row) => !row.some((cell) => cell.includes('---')))
                .map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-800/40">
                    {row
                      .filter((c) => c.trim().length > 0)
                      .map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 border-r border-slate-800 text-slate-300">
                          {cell.trim()}
                        </td>
                      ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
      return rendered;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Table lines
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        const cells = line.split('|').slice(1, -1);
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        const tbl = flushTable(`tbl_${i}`);
        if (tbl) elements.push(tbl);
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-xl sm:text-2xl font-bold text-white mt-6 mb-3 border-b border-slate-800 pb-2">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-lg font-bold text-indigo-300 mt-5 mb-2">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-base font-semibold text-indigo-200 mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith('![')) {
        // Image tag: ![alt](images/filename.png)
        const match = line.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
          const alt = match[1];
          let src = match[2];
          const fname = src.split('/').pop() || '';
          const fullSrc = `/api/outputs/${project.id}/images/${fname}`;
          elements.push(
            <div key={i} className="my-4 text-center">
              <img
                src={fullSrc}
                alt={alt}
                className="max-h-96 mx-auto rounded-lg border border-slate-700 shadow-md object-contain"
                onError={(e: any) => {
                  e.target.style.display = 'none';
                }}
              />
              {alt && <p className="text-[11px] text-slate-400 mt-1 italic">{alt}</p>}
            </div>
          );
        }
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={i} className="border-l-2 border-indigo-500 pl-3 my-2 text-slate-400 italic text-xs">
            {line.slice(2)}
          </blockquote>
        );
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={i} className="ml-4 list-disc text-slate-300 text-xs my-0.5">
            {line.trim().slice(2)}
          </li>
        );
      } else if (line.trim() === '---') {
        elements.push(<hr key={i} className="border-slate-800 my-4" />);
      } else if (line.trim().length > 0) {
        elements.push(
          <p key={i} className="text-slate-300 text-xs leading-relaxed my-2">
            {line}
          </p>
        );
      }
    }

    if (inTable) {
      const tbl = flushTable('tbl_end');
      if (tbl) elements.push(tbl);
    }

    return elements;
  };

  const hasUnsavedChanges = markdownContent !== originalContent;

  if (convertedChapters.length === 0) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">No Markdown Chapters Converted Yet</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Please review chapters and start conversion first. Converted chapters will appear here for rendered preview, source inspection, and editing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Studio Header Toolbar */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Chapter Switcher & Stepper */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevChapter}
            disabled={convertedChapters.findIndex((c) => c.id === selectedChapterId) <= 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
            title="Previous Chapter"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedChapterId}
            onChange={(e) => setSelectedChapterId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 max-w-[220px] sm:max-w-xs truncate"
          >
            {convertedChapters.map((c) => (
              <option key={c.id} value={c.id}>
                Ch. {c.chapter_num}: {c.title} ({c.page_count} pp.)
              </option>
            ))}
          </select>

          <button
            onClick={handleNextChapter}
            disabled={
              convertedChapters.findIndex((c) => c.id === selectedChapterId) >=
              convertedChapters.length - 1
            }
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
            title="Next Chapter"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'preview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={() => setViewMode('source')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'source'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Source</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Side-by-Side</span>
          </button>
        </div>

        {/* Actions: Save, Copy, Download */}
        <div className="flex items-center space-x-2">
          {saveStatus && <span className="text-[11px] text-emerald-400 font-medium">{saveStatus}</span>}

          {/* Selective Reconversion Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowReconvertMenu(!showReconvertMenu)}
              disabled={isReconverting}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
              title="Selectively reconvert this single chapter"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-indigo-400 ${isReconverting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isReconverting ? 'Reconverting...' : 'Selective Reconvert'}</span>
            </button>

            {showReconvertMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-30 space-y-1 text-xs">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Reconversion Options</p>
                <button
                  onClick={() => handleSelectiveReconvert('markdown', false)}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200"
                >
                  Standard Markdown Tables
                </button>
                <button
                  onClick={() => handleSelectiveReconvert('html', false)}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200"
                >
                  Render Complex Tables as HTML
                </button>
                <button
                  onClick={() => handleSelectiveReconvert('markdown', true)}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200"
                >
                  Force Tesseract OCR on Pages
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              hasUnsavedChanges
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-400 opacity-60'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium"
            title="Copy Markdown"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium"
            title="Download Chapter .md"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm h-[680px] flex">
        {/* Source Editor Panel */}
        {(viewMode === 'source' || viewMode === 'split') && (
          <div
            className={`h-full flex flex-col bg-[#0B0F19] ${
              viewMode === 'split' ? 'w-1/2 border-r border-slate-800' : 'w-full'
            }`}
          >
            <div className="p-2.5 px-4 bg-slate-900/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
              <span>RAW MARKDOWN SOURCE</span>
              <span>{markdownContent.length} chars</span>
            </div>
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              className="flex-1 w-full bg-transparent p-4 font-mono text-xs text-slate-200 resize-none focus:outline-none leading-relaxed selection:bg-indigo-900"
              spellCheck={false}
            />
          </div>
        )}

        {/* Rendered Preview Panel */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`h-full flex flex-col bg-[#0B0F19] overflow-hidden ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
          >
            <div className="p-2.5 px-4 bg-slate-900/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
              <span>RENDERED PREVIEW (PyMuPDF4LLM)</span>
              <span>Formatted Tables & Images</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {renderFormattedMarkdown(markdownContent)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
