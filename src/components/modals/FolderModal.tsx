import React, { useState } from 'react';
import { Folder, X } from 'lucide-react';
import { FolderItem } from '../../types';

interface FolderModalProps {
  folderToRename: FolderItem | null;
  onClose: () => void;
  onSubmit: (name: string, color?: string) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  folderToRename,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(folderToRename ? folderToRename.name : '');
  const [selectedColor, setSelectedColor] = useState(folderToRename?.color || 'sky');

  const colors = [
    { id: 'sky', bg: 'bg-sky-400' },
    { id: 'indigo', bg: 'bg-indigo-400' },
    { id: 'emerald', bg: 'bg-emerald-400' },
    { id: 'amber', bg: 'bg-amber-400' },
    { id: 'purple', bg: 'bg-purple-400' },
    { id: 'rose', bg: 'bg-rose-400' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), selectedColor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">
              {folderToRename ? 'Rename Folder' : 'New Folder'}
            </h3>
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
              Folder Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Projects"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Folder Color Accent
            </label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id)}
                  className={`w-6 h-6 rounded-full ${c.bg} transition ${
                    selectedColor === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
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
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white shadow-md shadow-sky-950/40 transition disabled:opacity-50"
            >
              {folderToRename ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
