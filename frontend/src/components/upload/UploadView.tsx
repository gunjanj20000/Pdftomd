import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
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
    <div className="space-y-6">
      {/* If active project is set, show Document Inspector */}
      {activeProject ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Inspecting uploaded document:</span>
            <button
              onClick={() => onProjectReady(null as any)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              + Upload Another PDF
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
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500/70 bg-[#111827]/80 rounded-2xl p-8 sm:p-14 text-center transition-all shadow-inner"
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
              <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5 shadow-lg shadow-indigo-600/10">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Select or Drop PDF Book to Inspect
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg leading-relaxed">
                Works with technical manuals, medical textbooks, and multi-chapter books. Supports files up to 1 GB.
              </p>

              {isUploading ? (
                <div className="w-full max-w-md mt-6 space-y-2">
                  <div className="flex justify-between text-xs text-slate-300 font-medium">
                    <span>Uploading & verifying integrity...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('upload-file-input')?.click()}
                  className="mt-6 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Browse PDF Files
                </button>
              )}
            </label>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Feature highlights grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="p-4 bg-[#111827] border border-slate-800 rounded-xl">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Intelligent Hierarchy
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Preserves book outlines, chapters, subchapters, and nested headers.
              </p>
            </div>
            <div className="p-4 bg-[#111827] border border-slate-800 rounded-xl">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Tables & Math
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Converts complex tables to clean Markdown or HTML and retains equations.
              </p>
            </div>
            <div className="p-4 bg-[#111827] border border-slate-800 rounded-xl">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-violet-400" />
                100% Offline & Private
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                All document parsing runs strictly locally on your machine or private server.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
