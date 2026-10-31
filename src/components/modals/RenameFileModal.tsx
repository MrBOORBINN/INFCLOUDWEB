import React, { useState } from 'react';
import { Edit2, X } from 'lucide-react';
import { FileItem } from '../../types';

interface RenameFileModalProps {
  file: FileItem | null;
  onClose: () => void;
  onSubmit: (newName: string) => void;
}

export const RenameFileModal: React.FC<RenameFileModalProps> = ({
  file,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(file ? file.name : '');

  if (!file) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Rename File</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              New File Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
            />
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
              disabled={!name.trim() || name.trim() === file.name}
              className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
            >
              Save Name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
