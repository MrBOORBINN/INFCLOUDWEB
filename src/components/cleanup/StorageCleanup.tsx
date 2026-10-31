import React from 'react';
import {
  Sparkles,
  Trash2,
  HardDrive,
  FileText,
  AlertTriangle,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { FileItem, NavigationTab } from '../../types';
import { formatBytes, formatDate } from '../../lib/utils';

interface StorageCleanupProps {
  files: FileItem[];
  trashedBytes: number;
  onDeleteFile: (file: FileItem) => void;
  onEmptyTrash: () => void;
  setActiveTab: (tab: NavigationTab) => void;
}

export const StorageCleanup: React.FC<StorageCleanupProps> = ({
  files,
  trashedBytes,
  onDeleteFile,
  onEmptyTrash,
  setActiveTab,
}) => {
  const activeFiles = files.filter((f) => !f.isTrashed);

  // Largest files (> 10MB or top 10)
  const largestFiles = [...activeFiles].sort((a, b) => b.size - a.size).slice(0, 8);

  // Old files (created > 30 days ago)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const oldFiles = activeFiles.filter((f) => new Date(f.createdAt).getTime() < thirtyDaysAgo).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-400" />
          <span>Storage Cleanup Assistant</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Intelligently identify bloated objects, purge retained trash, and optimize your 988 GB storage ledger.
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Empty Trash Card */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-red-950/40 text-red-400 border border-red-800/40">
                <Trash2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-red-400">{formatBytes(trashedBytes)}</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Recycle Bin Retained</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Trashed files continue to occupy quota until permanently purged.
            </p>
          </div>
          <button
            onClick={onEmptyTrash}
            disabled={trashedBytes === 0}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition disabled:opacity-40"
          >
            Purge Recycle Bin ({formatBytes(trashedBytes)})
          </button>
        </div>

        {/* Duplicate Finder Card */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-950/40 text-indigo-400 border border-indigo-800/40">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-indigo-400">Scanner</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Duplicate Files</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Scan for redundant duplicate files with matching payloads and hashes.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('duplicates')}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5"
          >
            <span>Scan Duplicates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Large Files Summary Card */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-sky-950/40 text-sky-400 border border-sky-800/40">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-sky-400">{largestFiles.length} Large</span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Large Media & Archives</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Quickly inspect and clean up the heaviest files in your cloud storage.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('files')}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5"
          >
            <span>Inspect All Files</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Largest Files Table */}
      {largestFiles.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            Largest Files Consuming Capacity
          </span>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60 overflow-hidden">
            {largestFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 text-xs hover:bg-zinc-850/60 transition"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="font-semibold text-zinc-200 truncate max-w-xs md:max-w-md">
                    {file.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-bold text-zinc-100">{formatBytes(file.size)}</span>
                  <button
                    onClick={() => onDeleteFile(file)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition"
                    title="Move to Trash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
