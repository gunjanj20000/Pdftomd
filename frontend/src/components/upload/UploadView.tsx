import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  Lock,
  BookOpen,
} from 'lucide-react';
import { Project } from '../../types';
import { api } from '../../api/client';
import { DocumentInspector } from './DocumentInspector';

interface UploadViewProps {
  activeProject: Project | null;
  onProjectReady: (project: Project) => void;
  onDetectChapters: (method: string, maxLevel?: number) => void;
  onDeleteProject: (projectId: string) => void;
  isDetecting: boolean;
}

export const UploadView: React.FC<UploadViewProps> = ({
  activeProject,
  onProjectReady,
  onDetectChapters,
  onDeleteProject,
  isDetecting,
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    setIsUploading(true);
    setUploadProgress(0);

    const fileArray = Array.from(files);

    try {
      const created = await api.uploadPdfs(fileArray, (pct) => {
        setUploadProgress(pct);
      });

      if (created && created.length > 0) {
        onProjectReady(created[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* If active project is set, show Document Inspector */}
      {activeProject ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Inspecting document structure:</span>
            <button
              onClick={() => onProjectReady(null as any)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              + Upload Another Document
            </button>
          </div>
          <DocumentInspector
            project={activeProject}
            onDetectChapters={onDetectChapters}
            onDeleteProject={onDeleteProject}
            isDetecting={isDetecting}
          />
        </div>
      ) : (
        /* Upload Box */
        <div className="space-y-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="border border-dashed border-slate-800 hover:border-indigo-500/50 bg-[#0E131F]/90 rounded-2xl p-8 sm:p-12 text-center transition-all shadow-sm"
          >
            <input
              type="file"
              id="upload-file-input"
              accept=".pdf"
              multiple
              onChange={onFileInput}
              className="hidden"
            />
            <label
              htmlFor="upload-file-input"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Upload PDF Book or Document
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                Extract chapter boundaries and save chapters as standalone PDFs or convert to Markdown.
              </p>

              {isUploading ? (
                <div className="w-full max-w-xs mt-5 space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('upload-file-input')?.click()}
                  className="mt-5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                >
                  Select File
                </button>
              )}
            </label>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#0E131F]/90 border border-slate-800/70 rounded-xl">
              <h4 className="text-xs font-medium text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Chapter Detection
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automated detection via bookmarks, TOC, or font headings.
              </p>
            </div>
            <div className="p-3.5 bg-[#0E131F]/90 border border-slate-800/70 rounded-xl">
              <h4 className="text-xs font-medium text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Dual Export Modes
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Save chapters as sliced PDFs or convert to clean Markdown.
              </p>
            </div>
            <div className="p-3.5 bg-[#0E131F]/90 border border-slate-800/70 rounded-xl">
              <h4 className="text-xs font-medium text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                100% Offline & Private
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All slicing and rendering executes locally on your system.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
