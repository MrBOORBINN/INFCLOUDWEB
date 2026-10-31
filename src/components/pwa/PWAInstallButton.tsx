import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-100 border border-zinc-700/60 font-medium transition active:scale-95 shadow-lg backdrop-blur-md ${
          compact ? 'p-2 text-xs' : 'px-3.5 py-1.5 text-xs'
        }`}
        title="Install INFCLOUD App"
      >
        <Download className="w-4 h-4 text-sky-400" />
        {!compact && <span>Install App</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-100 border border-zinc-700/60 font-medium transition active:scale-95 shadow-lg backdrop-blur-md ${
            compact ? 'p-2 text-xs' : 'px-3.5 py-1.5 text-xs'
          }`}
          title="Install on iOS"
        >
          <Smartphone className="w-4 h-4 text-sky-400" />
          {!compact && <span>Install on iOS</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Install INFCLOUD on iOS</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed space-y-2">
                1. Tap the <strong className="text-white">Share</strong> icon at the bottom of Safari.<br />
                2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.<br />
                3. Tap <strong className="text-white">Add</strong> in the top-right corner.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 py-2.5 text-sm font-medium text-white transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
