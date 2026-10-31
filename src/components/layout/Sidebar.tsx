import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Image,
  ArrowUpDown,
  Zap,
  Share2,
  Lock,
  Sparkles,
  Copy,
  Smartphone,
  Trash2,
  Settings,
  ShieldAlert,
  Package,
  KeyRound,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  trashedCount: number;
  activeTransfersCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  trashedCount,
  activeTransfersCount,
}) => {
  const { profile } = useAuth();

  const mainNavItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'files', label: 'All Files', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'packages', label: 'File Packages', icon: <Package className="w-4 h-4 text-sky-400" /> },
    { id: 'open-package', label: 'Open Package', icon: <KeyRound className="w-4 h-4 text-emerald-400" /> },
    { id: 'photos', label: 'Photos', icon: <Image className="w-4 h-4" /> },
    { id: 'transfers', label: 'Transfer Center', icon: <ArrowUpDown className="w-4 h-4" />, badge: activeTransfersCount > 0 ? activeTransfersCount : undefined },
    { id: 'quickdrop', label: 'QuickDrop', icon: <Zap className="w-4 h-4 text-amber-400" /> },
    { id: 'shares', label: 'Shared Links', icon: <Share2 className="w-4 h-4" /> },
    { id: 'vault', label: 'Private Vault', icon: <Lock className="w-4 h-4 text-emerald-400" /> },
  ];

  const utilityNavItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'cleanup', label: 'Storage Cleanup', icon: <Sparkles className="w-4 h-4 text-sky-400" /> },
    { id: 'duplicates', label: 'Duplicate Finder', icon: <Copy className="w-4 h-4" /> },
    { id: 'backup', label: 'Phone Backup', icon: <Smartphone className="w-4 h-4 text-purple-400" /> },
    { id: 'trash', label: 'Recycle Bin', icon: <Trash2 className="w-4 h-4 text-red-400" />, badge: trashedCount > 0 ? trashedCount : undefined },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  if (profile?.role === 'admin') {
    utilityNavItems.push({
      id: 'admin',
      label: 'Admin Console',
      icon: <ShieldAlert className="w-4 h-4 text-yellow-400" />,
    });
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-zinc-950/70 border-r border-zinc-800/80 p-3 select-none shrink-0 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2 block">
            Storage
          </span>
          <nav className="space-y-1">
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeTab === item.id
                    ? 'bg-zinc-800/90 text-white font-semibold shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-bold text-[10px]">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2 block">
            Utilities
          </span>
          <nav className="space-y-1">
            {utilityNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeTab === item.id
                    ? 'bg-zinc-800/90 text-white font-semibold shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-bold text-[10px]">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-800/60 px-3">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
          <span>INFCLOUD v1.0</span>
          <span>988 GB System</span>
        </div>
      </div>
    </aside>
  );
};
