import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  HardDrive,
  FileText,
  Folder,
  X,
} from 'lucide-react';
import { FileItem, FolderItem } from '../../types';
import { formatBytes, formatDate } from '../../lib/utils';

interface RecycleBinProps {
  files: FileItem[];
  folders: FolderItem[];
  trashedBytes: number;
  onRestoreFile: (file: FileItem) => void;
  onPermanentlyDeleteFile: (file: FileItem) => void;
  onRestoreFolder: (folder: FolderItem) => void;
  onPermanentlyDeleteFolder: (folder: FolderItem) => void;
  onEmptyTrash: () => void;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({
  files,
  folders,
  trashedBytes,
  onRestoreFile,
  onPermanentlyDeleteFile,
  onRestoreFolder,
  onPermanentlyDeleteFolder,
  onEmptyTrash,
}) => {
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);

  const trashedFiles = files.filter((f) => f.isTrashed);
  const trashedFolders = folders.filter((f) => f.isTrashed);

  const totalTrashedItems = trashedFiles.length + trashedFolders.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            <span>Recycle Bin</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Soft-deleted files and folders remain restorable. Items in the Recycle Bin continue to count towards your 988 GB quota until permanently removed.
          </p>
        </div>

        {totalTrashedItems > 0 && (
          <button
            onClick={() => setShowConfirmEmpty(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-950/40 transition active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Empty Recycle Bin ({formatBytes(trashedBytes)})</span>
          </button>
        )}
      </div>

      {/* Confirmation Dialog for Empty Trash */}
      {showConfirmEmpty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-red-950/60 text-red-400 border border-red-800/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Permanently Delete All?</h4>
                <p className="text-xs text-zinc-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-6">
              All <strong className="text-white">{totalTrashedItems} items ({formatBytes(trashedBytes)})</strong> will be permanently purged from the storage backend and metadata database.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmEmpty(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmEmpty(false);
                  onEmptyTrash();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition active:scale-95"
              >
                Purge All
              </button>
            </div>
          </div>
        </div>
      )}

      {totalTrashedItems === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center">
          <Trash2 className="w-12 h-12 text-zinc-600 mb-3" />
          <h4 className="text-sm font-semibold text-zinc-300">Recycle Bin is empty</h4>
          <p className="text-xs text-zinc-500 mt-1">
            Deleted files will be retained here for recovery.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Trashed Folders */}
          {trashedFolders.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Trashed Folders ({trashedFolders.length})
              </span>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60 overflow-hidden">
                {trashedFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3.5 text-xs hover:bg-zinc-850/60 transition"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Folder className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-zinc-200 block truncate">
                          {folder.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Deleted {formatDate(folder.trashedAt || folder.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onRestoreFolder(folder)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Permanently delete folder "${folder.name}"?`)) {
                            onPermanentlyDeleteFolder(folder);
                          }
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400"
                        title="Delete Permanently"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trashed Files */}
          {trashedFiles.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Trashed Files ({trashedFiles.length}) · {formatBytes(trashedBytes)}
              </span>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60 overflow-hidden">
                {trashedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3.5 text-xs hover:bg-zinc-850/60 transition"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-zinc-200 block truncate">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {formatBytes(file.size)} · Deleted {formatDate(file.trashedAt || file.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onRestoreFile(file)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Permanently remove "${file.name}"? Original bytes will be destroyed.`)) {
                            onPermanentlyDeleteFile(file);
                          }
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400"
                        title="Delete Permanently"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
