import React, { useState } from 'react';
import {
  Settings,
  User,
  HardDrive,
  Shield,
  Sun,
  Moon,
  LogOut,
  Mail,
  Key,
  CheckCircle2,
  AlertCircle,
  Download,
  Wifi,
  Bell,
  Trash2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useAuth, DEFAULT_QUOTA_BYTES } from '../../context/AuthContext';
import { formatBytes } from '../../lib/utils';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { updateUserPreferences, clearUserActivityLogs } from '../../lib/database';
import { UserPreferences, ViewMode } from '../../types';

interface SettingsViewProps {
  isDarkTheme: boolean;
  setIsDarkTheme: (dark: boolean) => void;
  totalUsedBytes: number;
  onClearRecentSearches?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkTheme,
  setIsDarkTheme,
  totalUsedBytes,
  onClearRecentSearches,
}) => {
  const { user, profile, signOut, sendPasswordReset, updateUserQuota } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [clearingActivity, setClearingActivity] = useState(false);

  const prefs = profile?.preferences || {};
  const [wifiOnly, setWifiOnly] = useState(prefs.wifiOnlyUpload ?? false);
  const [defaultView, setDefaultView] = useState<ViewMode>(prefs.defaultView || 'grid');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    setMessage(null);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        updatedAt: new Date().toISOString(),
      });
      setMessage('Profile updated successfully.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage('Failed to update name: ' + (err?.message || 'Error'));
    } finally {
      setSavingName(false);
    }
  };

  const handleToggleWifiOnly = async () => {
    if (!user) return;
    const newVal = !wifiOnly;
    setWifiOnly(newVal);
    await updateUserPreferences(user.uid, { wifiOnlyUpload: newVal });
    setMessage(newVal ? 'Wi-Fi Only mode enabled for uploads.' : 'Upload over any network enabled.');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangeDefaultView = async (view: ViewMode) => {
    if (!user) return;
    setDefaultView(view);
    await updateUserPreferences(user.uid, { defaultView: view });
  };

  const handleRequestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        if (user) await updateUserPreferences(user.uid, { notificationsEnabled: true });
        new Notification('INFCLOUD Notifications Enabled', {
          body: 'You will receive transfer alerts and upload completion notifications.',
          icon: '/icon.svg',
        });
      } else {
        setNotificationsEnabled(false);
        alert('Notification permission was denied in your browser settings.');
      }
    } else {
      alert('Your browser does not support Web Notifications.');
    }
  };

  const handleClearActivity = async () => {
    if (!user) return;
    if (confirm('Clear your activity history and recent audit logs?')) {
      setClearingActivity(true);
      await clearUserActivityLogs(user.uid);
      if (onClearRecentSearches) onClearRecentSearches();
      setClearingActivity(false);
      setMessage('Activity logs cleared.');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordReset(user.email);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 5000);
    } catch {
      alert('Failed to send reset email.');
    }
  };

  const currentQuota = profile?.maxQuotaBytes || DEFAULT_QUOTA_BYTES;
  const quotaPresets = [
    { label: '15 GB Standard Free', bytes: 15 * 1_000_000_000 },
    { label: '100 GB Pro Tier', bytes: 100 * 1_000_000_000 },
    { label: '988 GB Target Max', bytes: 988 * 1_000_000_000 },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-400" />
          <span>Account & System Settings</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your INFCLOUD credentials, 988 GB storage tier, and Smart Memory preferences.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {resetSuccess && (
        <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-800 text-xs text-sky-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Password reset email dispatched to {user?.email}.</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
            {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {profile?.displayName || 'INFCLOUD User'}
            </h3>
            <p className="text-xs text-zinc-400">{user?.email}</p>
            {profile?.role === 'admin' && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-sky-950 text-sky-400 text-[10px] font-semibold border border-sky-800/60">
                Verified System Administrator
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdateName} className="space-y-3 pt-3 border-t border-zinc-800/80">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Display Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Mercer"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
              />
              <button
                type="submit"
                disabled={savingName || !displayName.trim()}
                className="py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-md transition disabled:opacity-50"
              >
                {savingName ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* INFCLOUD Smart Memory & Network Preferences */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-white">INFCLOUD Smart Memory</h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Personalization and network transfer policies synchronized across your authenticated devices.
          </p>
        </div>

        {/* Wi-Fi Only Upload Policy */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs">
          <div>
            <span className="font-semibold text-zinc-200 block flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-sky-400" />
              <span>Wi-Fi Only Uploads</span>
            </span>
            <span className="text-[11px] text-zinc-400">
              Pause transfers when on mobile data to conserve cellular network bandwidth.
            </span>
          </div>
          <button
            onClick={handleToggleWifiOnly}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              wifiOnly
                ? 'bg-sky-500 text-white shadow-md'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {wifiOnly ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Default View Mode */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs">
          <div>
            <span className="font-semibold text-zinc-200 block">Default File Layout</span>
            <span className="text-[11px] text-zinc-400">
              Choose your preferred view when browsing files and folders.
            </span>
          </div>
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
              onClick={() => handleChangeDefaultView('grid')}
              className={`p-1.5 rounded-lg transition ${
                defaultView === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleChangeDefaultView('list')}
              className={`p-1.5 rounded-lg transition ${
                defaultView === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs">
          <div>
            <span className="font-semibold text-zinc-200 block flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Background Transfer Alerts</span>
            </span>
            <span className="text-[11px] text-zinc-400">
              Receive browser notifications when large uploads complete or pause.
            </span>
          </div>
          <button
            onClick={handleRequestNotifications}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              notificationsEnabled
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            {notificationsEnabled ? 'Permission Granted' : 'Enable Alerts'}
          </button>
        </div>

        {/* Privacy & Clear History */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs">
          <div>
            <span className="font-semibold text-zinc-200 block">Clear Activity & Search Memory</span>
            <span className="text-[11px] text-zinc-400">
              Erase recent search queries and activity history logs from your account.
            </span>
          </div>
          <button
            onClick={handleClearActivity}
            disabled={clearingActivity}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>{clearingActivity ? 'Clearing...' : 'Clear Memory'}</span>
          </button>
        </div>
      </div>

      {/* Quota Management Card */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-sky-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Configured Storage Capacity</h4>
              <p className="text-xs text-zinc-400">
                Current Tier: <strong className="text-white">{formatBytes(currentQuota)}</strong> ({formatBytes(totalUsedBytes)} used)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          {quotaPresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => updateUserQuota(preset.bytes)}
              className={`p-3 rounded-2xl border text-xs font-semibold transition text-left ${
                currentQuota === preset.bytes
                  ? 'bg-zinc-800 border-sky-500 text-white shadow-md'
                  : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="block text-[11px] text-zinc-500 mb-0.5">Tier Selection</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Security & Password */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h4 className="text-sm font-bold text-white">Security & Password</h4>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs">
          <div>
            <span className="font-semibold text-zinc-200 block">Password Management</span>
            <span className="text-[11px] text-zinc-400">
              Receive a secure cryptographic password reset email.
            </span>
          </div>
          <button
            onClick={handlePasswordReset}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition"
          >
            Dispatch Reset Email
          </button>
        </div>
      </div>

      {/* Appearance & PWA Installation */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <h4 className="text-sm font-bold text-white">Interface & Installation</h4>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs">
          <div>
            <span className="font-semibold text-zinc-200 block">Color Theme</span>
            <span className="text-[11px] text-zinc-400">
              Switch between Obsidian Dark and Clean Light palettes.
            </span>
          </div>
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition"
          >
            {isDarkTheme ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDarkTheme ? 'Obsidian Dark' : 'Clean Light'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs">
          <div>
            <span className="font-semibold text-zinc-200 block">Progressive Web App</span>
            <span className="text-[11px] text-zinc-400">
              Install INFCLOUD on your Android home screen or desktop application dock.
            </span>
          </div>
          <PWAInstallButton />
        </div>
      </div>

      {/* Sign Out Section */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">Account Session</h4>
          <p className="text-xs text-zinc-400">
            Sign out of your active authenticated INFCLOUD session.
          </p>
        </div>
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 text-xs font-semibold text-red-300 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
            <h4 className="text-sm font-bold text-white mb-2">Confirm Sign Out</h4>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to exit your active INFCLOUD session on this device?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowSignOutConfirm(false);
                  await signOut();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
