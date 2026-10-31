import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="Network status banner"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-amber-500/90 backdrop-blur-md px-4 py-2 text-xs font-medium text-zinc-950 shadow-2xl border border-amber-400/50"
    >
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>Offline Mode — Cached files and offline UI active. An internet connection is required for cloud synchronization.</span>
    </aside>
  );
};
