import React from 'react';
import {
  Image,
  Video,
  FileText,
  Music,
  Archive,
  Zap,
  Lock,
  Smartphone,
  Star,
  Share2,
} from 'lucide-react';
import { NavigationTab, FileCategory } from '../../types';

interface QuickShortcutsProps {
  setActiveTab: (tab: NavigationTab) => void;
  setSelectedCategory: (cat: FileCategory) => void;
  filesCount: number;
  starredCount: number;
  sharedCount: number;
  vaultCount: number;
}

export const QuickShortcuts: React.FC<QuickShortcutsProps> = ({
  setActiveTab,
  setSelectedCategory,
  starredCount,
  sharedCount,
  vaultCount,
}) => {
  const categories = [
    {
      id: 'photos' as NavigationTab,
      label: 'Photos',
      icon: <Image className="w-5 h-5 text-sky-400" />,
      onClick: () => {
        setSelectedCategory('images');
        setActiveTab('photos');
      },
      gradient: 'from-sky-500/10 to-blue-600/5',
    },
    {
      id: 'videos' as NavigationTab,
      label: 'Videos',
      icon: <Video className="w-5 h-5 text-indigo-400" />,
      onClick: () => {
        setSelectedCategory('videos');
        setActiveTab('files');
      },
      gradient: 'from-indigo-500/10 to-purple-600/5',
    },
    {
      id: 'documents' as NavigationTab,
      label: 'Documents',
      icon: <FileText className="w-5 h-5 text-emerald-400" />,
      onClick: () => {
        setSelectedCategory('documents');
        setActiveTab('files');
      },
      gradient: 'from-emerald-500/10 to-teal-600/5',
    },
    {
      id: 'audio' as NavigationTab,
      label: 'Audio',
      icon: <Music className="w-5 h-5 text-amber-400" />,
      onClick: () => {
        setSelectedCategory('audio');
        setActiveTab('files');
      },
      gradient: 'from-amber-500/10 to-orange-600/5',
    },
    {
      id: 'quickdrop' as NavigationTab,
      label: 'QuickDrop',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      badge: 'Fast Share',
      onClick: () => setActiveTab('quickdrop'),
      gradient: 'from-amber-500/10 to-yellow-600/5',
    },
    {
      id: 'vault' as NavigationTab,
      label: 'Private Vault',
      icon: <Lock className="w-5 h-5 text-emerald-400" />,
      badge: vaultCount > 0 ? `${vaultCount} locked` : 'PIN Protected',
      onClick: () => setActiveTab('vault'),
      gradient: 'from-emerald-500/10 to-green-600/5',
    },
    {
      id: 'shares' as NavigationTab,
      label: 'Shared Links',
      icon: <Share2 className="w-5 h-5 text-sky-400" />,
      badge: sharedCount > 0 ? `${sharedCount} active` : undefined,
      onClick: () => setActiveTab('shares'),
      gradient: 'from-sky-500/10 to-cyan-600/5',
    },
    {
      id: 'backup' as NavigationTab,
      label: 'Phone Backup',
      icon: <Smartphone className="w-5 h-5 text-purple-400" />,
      badge: 'Android Sync',
      onClick: () => setActiveTab('backup'),
      gradient: 'from-purple-500/10 to-pink-600/5',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white tracking-tight">Quick Access</h3>
        <button
          onClick={() => {
            setSelectedCategory('all');
            setActiveTab('files');
          }}
          className="text-xs text-sky-400 hover:text-sky-300 font-medium transition"
        >
          View all files →
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((cat, idx) => (
          <button
            key={idx}
            onClick={cat.onClick}
            className={`flex flex-col p-4 rounded-2xl bg-gradient-to-br ${cat.gradient} bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-850/80 transition active:scale-[0.98] text-left group shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 group-hover:scale-110 transition">
                {cat.icon}
              </div>
              {cat.badge && (
                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-950/80 px-2 py-0.5 rounded-md border border-zinc-800">
                  {cat.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-zinc-100 group-hover:text-white transition">
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
