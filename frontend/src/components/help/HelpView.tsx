import React from 'react';
import {
  HelpCircle,
  BookOpen,
  Sparkles,
  Layers,
  Terminal,
  ShieldCheck,
  Cpu,
  FileText,
  FolderTree,
} from 'lucide-react';

export const HelpView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-indigo-400" />
          PDF Book to Markdown Studio Documentation
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          A complete guide to intelligent chapter detection, PyMuPDF4LLM conversion, and large textbook optimization.
        </p>
      </div>

      {/* Detection Methods Guide */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          5 Chapter Detection Methods Explained
        </h3>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
              Method A: PDF Bookmark Detection (get_toc)
            </h4>
            <p className="text-slate-400">
              Reads embedded PDF outlines. Preserves hierarchical structures (Level 1 main chapters, Level 2 subchapters). Start pages map to bookmark targets, and end pages are automatically calculated from the subsequent bookmark.
            </p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
              Method B: Printed Table of Contents Parsing
            </h4>
            <p className="text-slate-400">
              When PDF bookmarks are absent, the studio inspects the opening pages (default 25 pages) for printed tables of contents. It identifies entries, dotted leaders, roman and arabic page numbers, and automatically calculates the physical page offset (e.g. printed page 1 starting on physical PDF page 14).
            </p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <h4 className="font-bold text-violet-300 flex items-center gap-1.5">
              Method C: Automatic Heading & Visual Font Analysis
            </h4>
            <p className="text-slate-400">
              Analyzes visual font size distributions to compute the book's baseline body text size. Identifies prominent headings (e.g. &ge;1.35x body size, bold weight, upper third of page) and matches patterns such as <code>CHAPTER 1</code>, <code>PART I</code>, or <code>1. Introduction</code>. Filters out repeated running headers and footers.
            </p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
              Method D: Manual Boundary Editing
            </h4>
            <p className="text-slate-400">
              Full manual control: select start and end pages, split any chapter into two parts at a specific page, merge multiple chapters, re-order, rename, or delete boundaries before launching conversion.
            </p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
              Method E: Heuristic Layout Segmentation
            </h4>
            <p className="text-slate-400">
              An offline rule-based heuristic fallback that segments massive documents into coherent logical reading blocks based on page layout whitespace and first non-empty lines.
            </p>
          </div>
        </div>
      </div>

      {/* Large PDF Optimization & Memory Safety */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Cpu className="w-4 h-4 text-emerald-400" />
          Large Textbook & Memory Optimization
        </h3>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            When converting 500–3000+ page textbooks (e.g., medical treatises or programming bibles), the studio never loads the entire document into browser memory:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li><strong>Chunked Processing:</strong> Each chapter is converted independently in isolated page slices.</li>
            <li><strong>SQLite Persistence:</strong> Chapter conversion status is saved immediately. If a job is paused or interrupted, resuming skips already completed chapters.</li>
            <li><strong>Disk Buffering:</strong> Uploaded PDFs and generated Markdown files are streamed directly to disk in 1 MB chunks.</li>
            <li><strong>Image Optimization:</strong> Decorative icons below the configured resolution are automatically discarded to keep Markdown files clean.</li>
          </ul>
        </div>
      </div>

      {/* Deployment Modes */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Terminal className="w-4 h-4 text-violet-400" />
          Deployment Modes
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <h4 className="font-bold text-white">Local Desktop Mode</h4>
            <p className="text-slate-400">
              Run <code>./scripts/start.sh</code> (or <code>start.bat</code> on Windows). Access locally at <code>http://localhost:3000</code> or <code>http://localhost:8000</code>. All processing stays 100% on your device.
            </p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <h4 className="font-bold text-white">Server / VM Mode</h4>
            <p className="text-slate-400">
              Deploy on Ubuntu or cloud instances (Oracle Cloud, AWS, DigitalOcean). Accessible securely over your LAN or domain through Nginx/reverse proxy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
