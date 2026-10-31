import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Image,
  ArrowUpDown,
  Menu,
  X,
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

interface MobileNavProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  trashedCount: number;
  activeTransfersCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  trashedCount,
  activeTransfersCount,
}) => {
  const { profile } = useAuth();
  const [showDrawer, setShowDrawer] = useState(false);

  const bottomNavItems = [
    { id: 'dashboard' as NavigationTab, label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'files' as NavigationTab, label: 'Files', icon: <FolderOpen className="w-5 h-5" /> },
    { id: 'photos' as NavigationTab, label: 'Photos', icon: <Image className="w-5 h-5" /> },
    {
      id: 'transfers' as NavigationTab,
      label: 'Transfers',
      icon: <ArrowUpDown className="w-5 h-5" />,
      badge: activeTransfersCount > 0 ? activeTransfersCount : undefined,
    },
  ];

  const drawerItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'packages', label: 'File Packages', icon: <Package className="w-5 h-5 text-sky-400" /> },
    { id: 'open-package', label: 'Open Package Code', icon: <KeyRound className="w-5 h-5 text-emerald-400" /> },
    { id: 'quickdrop', label: 'QuickDrop (Fast Share)', icon: <Zap className="w-5 h-5 text-amber-400" /> },
    { id: 'shares', label: 'Shared Links', icon: <Share2 className="w-5 h-5 text-sky-400" /> },
    { id: 'vault', label: 'Private Vault (PIN)', icon: <Lock className="w-5 h-5 text-emerald-400" /> },
    { id: 'cleanup', label: 'Storage Cleanup', icon: <Sparkles className="w-5 h-5 text-blue-400" /> },
    { id: 'duplicates', label: 'Duplicate Finder', icon: <Copy className="w-5 h-5 text-indigo-400" /> },
    { id: 'backup', label: 'Phone Backup', icon: <Smartphone className="w-5 h-5 text-purple-400" /> },
    { id: 'trash', label: 'Recycle Bin', icon: <Trash2 className="w-5 h-5 text-red-400" />, badge: trashedCount > 0 ? trashedCount : undefined },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5 text-zinc-300" /> },
  ];

  if (profile?.role === 'admin') {
    drawerItems.push({
      id: 'admin',
      label: 'Admin Console',
      icon: <ShieldAlert className="w-5 h-5 text-yellow-400" />,
    });
  }

  return (
    <>
      {/* Fixed Bottom Thumb Bar */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-xl px-2 py-1 safe-area-pb">
        <div className="flex items-center justify-around h-14">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition active:scale-95 ${
                activeTab === item.id ? 'text-sky-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full bg-sky-500 text-zinc-950 font-black text-[9px] leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 leading-none">{item.label}</span>
            </button>
          ))}

          {/* More Drawer Trigger */}
          <button
            onClick={() => setShowDrawer(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] text-zinc-400 hover:text-zinc-200 active:scale-95 transition"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-1 leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up Drawer for Extra Features */}
      {showDrawer && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full rounded-t-3xl bg-zinc-900 border-t border-zinc-800 p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <span className="font-bold text-white text-base">INFCLOUD Hub</span>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {drawerItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setShowDrawer(false);
                  }}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs font-semibold text-left transition active:scale-95 ${
                    activeTab === item.id
                      ? 'bg-zinc-800 border-sky-500/60 text-white shadow-md'
                      : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  {item.icon}
                  <div className="flex-1 truncate">
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-red-950 text-red-400 text-[10px]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowDrawer(false)}
              className="w-full mt-5 py-3 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
