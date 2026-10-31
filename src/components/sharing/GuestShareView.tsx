import React, { useState, useEffect } from 'react';
import {
  Download,
  Lock,
  AlertCircle,
  Clock,
  Shield,
  FileCheck,
  HardDrive,
} from 'lucide-react';
import { ShareRecord } from '../../types';
import { getShareByToken, incrementShareAccess } from '../../lib/database';
import { formatBytes, formatDate, hashPassword, getFileCategory } from '../../lib/utils';
import { downloadFileBlob, getIDBObject } from '../../lib/storage';
import { Logo } from '../brand/Logo';

interface GuestShareViewProps {
  shareToken: string;
  onExit: () => void;
}

export const GuestShareView: React.FC<GuestShareViewProps> = ({ shareToken, onExit }) => {
  const [share, setShare] = useState<ShareRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadUrlResolved, setDownloadUrlResolved] = useState<string | null>(null);

  useEffect(() => {
    const fetchShare = async () => {
      setLoading(true);
      setError(null);
      try {
        const record = await getShareByToken(shareToken);
        if (!record) {
          setError('This share link does not exist or has been removed.');
          setLoading(false);
          return;
        }

        if (record.isRevoked) {
          setError('The owner has revoked access to this shared file.');
          setLoading(false);
          return;
        }

        if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
          setError('This shared link has expired.');
          setLoading(false);
          return;
        }

        setShare(record);
        if (!record.isPasswordProtected) {
          setIsUnlocked(true);
        }
      } catch (err: any) {
        setError('Failed to resolve share link.');
      } finally {
        setLoading(false);
      }
    };

    fetchShare();
  }, [shareToken]);

  // Attempt to resolve preview/download URL when unlocked
  useEffect(() => {
    if (!isUnlocked || !share) return;

    const resolveUrl = async () => {
      try {
        const blob = await getIDBObject(share.storageKey);
        if (blob) {
          setDownloadUrlResolved(URL.createObjectURL(blob));
        } else if (share.downloadUrl) {
          setDownloadUrlResolved(share.downloadUrl);
        }
      } catch {
        if (share.downloadUrl) setDownloadUrlResolved(share.downloadUrl);
      }
    };

    resolveUrl();
  }, [isUnlocked, share]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!share || !share.passwordHash) return;

    try {
      const hashed = await hashPassword(passwordInput.trim());
      if (hashed === share.passwordHash) {
        setIsUnlocked(true);
      } else {
        setPasswordError('Incorrect passphrase. Access denied.');
      }
    } catch {
      setPasswordError('Verification failed.');
    }
  };

  const handleDownload = async () => {
    if (!share) return;
    setDownloading(true);
    try {
      await incrementShareAccess(share.id);
      await downloadFileBlob(share.storageKey, downloadUrlResolved || share.downloadUrl, share.fileName);
    } catch (err: any) {
      alert('Download error: ' + (err?.message || 'Failed to download file.'));
    } finally {
      setDownloading(false);
    }
  };

  const category = share ? getFileCategory(share.mimeType, share.fileName) : 'other';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-between p-4 md:p-8">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between pb-6 border-b border-zinc-800">
        <Logo size="md" showText={true} />
        <button
          onClick={onExit}
          className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 transition"
        >
          Go to INFCLOUD App →
        </button>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-lg my-auto py-10">
        {loading ? (
          <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-2xl">
            <span className="w-10 h-10 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin mb-4" />
            <h3 className="text-base font-bold text-white">Validating Share Link</h3>
            <p className="text-xs text-zinc-400 mt-1">Verifying cryptographic token authorization...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-zinc-900/80 border border-red-900/50 shadow-2xl">
            <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800 text-red-400 mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Access Denied</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">{error}</p>
            <button
              onClick={onExit}
              className="py-2.5 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
            >
              Back to INFCLOUD Home
            </button>
          </div>
        ) : share && !isUnlocked ? (
          /* Password Gate */
          <div className="flex flex-col p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl text-center">
            <div className="mx-auto p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Protected Shared File</h3>
            <p className="text-xs text-zinc-400 mb-6">
              The owner has protected <strong className="text-white">{share.fileName}</strong> with a passphrase.
            </p>

            {passwordError && (
              <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                required
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter passphrase"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition text-center"
              />
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-sm font-semibold text-white shadow-lg transition active:scale-95"
              >
                Unlock & View File
              </button>
            </form>
          </div>
        ) : share ? (
          /* Unlocked File Ready for Download */
          <div className="flex flex-col p-6 md:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-sky-400 shrink-0 shadow-lg">
                <FileCheck className="w-8 h-8" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold text-sky-400 tracking-wider uppercase">
                  Verified Shared Payload
                </span>
                <h3 className="text-base font-bold text-white truncate mt-0.5">
                  {share.fileName}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {formatBytes(share.fileSize)} · {share.mimeType || 'Binary file'}
                </p>
              </div>
            </div>

            {/* In-browser preview if image */}
            {category === 'images' && downloadUrlResolved && (
              <div className="w-full h-48 rounded-2xl overflow-hidden mb-6 bg-zinc-950 border border-zinc-800 flex items-center justify-center p-2">
                <img
                  src={downloadUrlResolved}
                  alt={share.fileName}
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              </div>
            )}

            <div className="space-y-3 mb-6 text-xs text-zinc-400">
              {share.expiresAt && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span>Link Expiry</span>
                  </span>
                  <span className="text-zinc-200">{formatDate(share.expiresAt)}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Transfer Security</span>
                </span>
                <span className="text-emerald-400 font-medium">Encrypted TLS & Authentic Hash</span>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-sm font-bold text-white shadow-xl shadow-sky-950/40 transition active:scale-95 disabled:opacity-50"
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Downloading file...
                </span>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download File ({formatBytes(share.fileSize)})</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zinc-600">
        INFCLOUD Secure Storage · High-Capacity Universal Cloud Platform
      </div>
    </div>
  );
};
