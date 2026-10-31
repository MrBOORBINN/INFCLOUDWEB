import React, { useState } from 'react';
import { FolderInput, Folder, Home, X } from 'lucide-react';
import { FileItem, FolderItem } from '../../types';

interface MoveFileModalProps {
  file: FileItem | null;
  folders: FolderItem[];
  onClose: () => void;
  onSubmit: (targetFolderId: string | null) => void;
}

export const MoveFileModal: React.FC<MoveFileModalProps> = ({
  file,
  folders,
  onClose,
  onSubmit,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(file?.parentFolderId || null);

  if (!file) return null;

  const activeFolders = folders.filter((f) => !f.isTrashed && !f.isVault);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedFolderId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <FolderInput className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Move to Folder</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {/* Root / Home Option */}
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                selectedFolderId === null
                  ? 'bg-zinc-800 border-sky-500 text-white'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 text-sky-400" />
              <span>Root Storage (Home)</span>
            </button>

            {/* Folders List */}
            {activeFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolderId(f.id)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                  selectedFolderId === f.id
                    ? 'bg-zinc-800 border-sky-500 text-white'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Folder className="w-4 h-4 text-sky-400" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white shadow-md transition"
            >
              Move Here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
