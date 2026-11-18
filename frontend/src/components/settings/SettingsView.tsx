import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  Image as ImageIcon,
  Table,
  Cpu,
  Trash2,
  CheckCircle2,
  Save,
  HardDrive,
  Info,
} from 'lucide-react';
import { ConversionSettings, OcrInfo, SystemStats } from '../../types';
import { api } from '../../api/client';

interface SettingsViewProps {
  stats: SystemStats | null;
  onRefreshStats: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ stats, onRefreshStats }) => {
  const [settings, setSettings] = useState<ConversionSettings>({
    preserve_headings: true,
    preserve_tables: true,
    table_format: 'markdown',
    extract_images: true,
    image_format: 'png',
    min_image_dimension: 50,
    image_quality: 90,
    include_page_numbers: false,
    remove_repeated_headers: true,
    remove_repeated_footers: true,
    enable_ocr: false,
    ocr_language: 'eng',
    batch_size: 5,
    output_format: 'individual',
  });

  const [ocrInfo, setOcrInfo] = useState<OcrInfo | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [cacheClearMsg, setCacheClearMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
    api.getOcrInfo().then(setOcrInfo).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await api.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all temporary files in data/temp?')) return;
    try {
      const res = await api.clearCache();
      setCacheClearMsg(`Deleted ${res.deleted_items} temporary items.`);
      onRefreshStats();
      setTimeout(() => setCacheClearMsg(null), 3500);
    } catch (err: any) {
      alert(`Clear cache failed: ${err.message}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Studio & Conversion Settings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Global engine preferences for text formatting, table output, image extraction, and OCR.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Setting Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Text & Page Formatting */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Text & Page Formatting
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Preserve Heading Hierarchy</span>
                <span className="text-[11px] text-slate-400">Maintains H1, H2, H3 structure</span>
              </div>
              <input
                type="checkbox"
                checked={settings.preserve_headings}
                onChange={(e) => setSettings({ ...settings, preserve_headings: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Remove Repeated Running Headers</span>
                <span className="text-[11px] text-slate-400">Strips book title & author repeating on every page</span>
              </div>
              <input
                type="checkbox"
                checked={settings.remove_repeated_headers}
                onChange={(e) => setSettings({ ...settings, remove_repeated_headers: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Remove Repeated Running Footers</span>
                <span className="text-[11px] text-slate-400">Filters page numbers and footer notes</span>
              </div>
              <input
                type="checkbox"
                checked={settings.remove_repeated_footers}
                onChange={(e) => setSettings({ ...settings, remove_repeated_footers: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Include Page Separators</span>
                <span className="text-[11px] text-slate-400">Inserts visual breaks between physical PDF pages</span>
              </div>
              <input
                type="checkbox"
                checked={settings.include_page_numbers}
                onChange={(e) => setSettings({ ...settings, include_page_numbers: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Section 2: Table & Document Output */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Table className="w-4 h-4 text-emerald-400" />
            Tables & Output Structure
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Table Output Format:
              </label>
              <select
                value={settings.table_format}
                onChange={(e) => setSettings({ ...settings, table_format: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="markdown">Standard Markdown Tables (| col | col |)</option>
                <option value="html">Rich HTML Tables (&lt;table&gt;...&lt;/table&gt;)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Default Chapter Packaging:
              </label>
              <select
                value={settings.output_format}
                onChange={(e) => setSettings({ ...settings, output_format: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="individual">Individual Markdown File Per Chapter</option>
                <option value="combined">Combined Single Markdown File for Entire Book</option>
                <option value="both">Both (Individual + Combined)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Batch Chunk Size (Pages per batch):
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.batch_size}
                onChange={(e) => setSettings({ ...settings, batch_size: parseInt(e.target.value) || 5 })}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Image Extraction */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <ImageIcon className="w-4 h-4 text-violet-400" />
            Figure & Image Extraction
          </h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Extract Book Images</span>
                <span className="text-[11px] text-slate-400">Save figures to images/ folder</span>
              </div>
              <input
                type="checkbox"
                checked={settings.extract_images}
                onChange={(e) => setSettings({ ...settings, extract_images: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Image Format:</label>
                <select
                  value={settings.image_format}
                  onChange={(e) => setSettings({ ...settings, image_format: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="png">PNG (Lossless)</option>
                  <option value="jpg">JPEG (Compressed)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Min Dimension (px):
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={settings.min_image_dimension}
                  onChange={(e) =>
                    setSettings({ ...settings, min_image_dimension: parseInt(e.target.value) || 50 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Filters out decorative icons smaller than {settings.min_image_dimension}px to prevent cluttering markdown.
            </p>
          </div>
        </div>

        {/* Section 4: OCR Engine & System Cache */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Cpu className="w-4 h-4 text-amber-400" />
            OCR Engine & Storage
          </h3>

          <div className="space-y-4">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Tesseract OCR Status</span>
                <span className="text-[11px] text-slate-400">
                  {ocrInfo?.ocr_available ? 'Engine detected on system' : 'Not installed'}
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  ocrInfo?.ocr_available
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {ocrInfo?.ocr_available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            {ocrInfo?.ocr_available && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">OCR Language:</label>
                <select
                  value={settings.ocr_language}
                  onChange={(e) => setSettings({ ...settings, ocr_language: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                >
                  {ocrInfo.languages.map((l) => (
                    <option key={l} value={l}>
                      {l.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Temporary Cache</span>
                <span className="text-[11px] text-slate-500">
                  Total Studio Storage: {stats ? formatBytes(stats.total_storage_bytes) : '0 B'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear Cache</span>
              </button>
            </div>
            {cacheClearMsg && <p className="text-[11px] text-emerald-400">{cacheClearMsg}</p>}
          </div>
        </div>
      </div>
    </form>
  );
};
