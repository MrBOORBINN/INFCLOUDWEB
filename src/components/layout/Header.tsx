import React, { useState } from 'react';
import {
  Search,
  Upload,
  Bell,
  Sun,
  Moon,
  LogOut,
  Settings,
  HardDrive,
  Shield,
  X,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../brand/Logo';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { formatBytes } from '../../lib/utils';
import { NavigationTab } from '../../types';

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenUpload: () => void;
  isDarkTheme: boolean;
  setIsDarkTheme: (dark: boolean) => void;
  totalUsedBytes: number;
  maxQuotaBytes: number;
}

export const Header: React.FC<HeaderProps> = ({
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenUpload,
  isDarkTheme,
  setIsDarkTheme,
  totalUsedBytes,
  maxQuotaBytes,
}) => {
  const { user, profile, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const usagePercent = Math.min(100, Math.max(0, (totalUsedBytes / maxQuotaBytes) * 100));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-3 md:px-6 h-16 gap-2 md:gap-4 max-w-7xl mx-auto">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="cursor-pointer transition hover:opacity-90 shrink-0"
        >
          <Logo size="md" showText={true} />
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-2 relative hidden sm:block">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all files, folders, and tags..."
            className="w-full bg-zinc-900/90 border border-zinc-800 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 rounded-xl py-2 pl-10 pr-9 focus:outline-none focus:border-zinc-600 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          {/* Quick Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs md:text-sm font-semibold shadow-lg shadow-sky-950/40 transition active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden md:inline">Upload</span>
          </button>

          {/* Storage Quota Quick Preview */}
          <div
            onClick={() => setActiveTab('settings')}
            className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-300 hover:border-zinc-700 cursor-pointer transition"
            title="INFCLOUD 988 GB Target Quota"
          >
            <HardDrive className="w-3.5 h-3.5 text-sky-400" />
            <div className="flex flex-col text-left">
              <span className="font-medium text-[11px] leading-tight text-white">
                {formatBytes(totalUsedBytes)} / 988 GB
              </span>
              <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
                  style={{ width: `${Math.max(2, usagePercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* PWA Install Button */}
          <PWAInstallButton compact={true} />

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-4 text-xs text-zinc-300 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
                  <span className="font-semibold text-white">Notifications</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Storage Quota Active</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Your account is provisioned with 988 GB target capacity.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                    <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Private Object Storage</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Dual cloud and private resilience enabled.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
            title="Toggle theme"
          >
            {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Profile Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-medium text-zinc-200 hidden md:inline max-w-[90px] truncate">
                {profile?.displayName || user?.email?.split('@')[0] || 'User'}
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 text-xs">
                <div className="px-3 py-2.5 border-b border-zinc-800">
                  <p className="font-semibold text-white truncate">
                    {profile?.displayName || 'INFCLOUD Member'}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">{user?.email}</p>
                  {profile?.role === 'admin' && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-sky-950 text-sky-400 text-[10px] font-semibold border border-sky-800/50">
                      Administrator
                    </span>
                  )}
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl transition"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Account Settings</span>
                  </button>

                  {profile?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setActiveTab('admin');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sky-400 hover:bg-zinc-800/80 rounded-xl transition"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Admin Console</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-950/40 rounded-xl transition mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
