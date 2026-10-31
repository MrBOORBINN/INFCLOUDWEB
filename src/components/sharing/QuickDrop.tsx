import React, { useState } from 'react';
import {
  Zap,
  Upload,
  Link2,
  Copy,
  Check,
  Clock,
  Lock,
  Share2,
  AlertCircle,
  X,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateSecureToken, hashPassword, formatBytes } from '../../lib/utils';
import { createShareRecord } from '../../lib/database';
import { ShareRecord } from '../../types';

interface QuickDropProps {
  onStartUpload: (files: FileList | File[], onFinished?: (results: any[]) => void) => void;
}

export const QuickDrop: React.FC<QuickDropProps> = () => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expiryHours, setExpiryHours] = useState<'1' | '6' | '24' | '72'>('24');
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const arr = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...arr]);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateQuickDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedFiles.length === 0) {
      setError('Please select at least one file to drop.');
      return;
    }

    if (enablePassword && !password.trim()) {
      setError('Please specify a passphrase or turn off password protection.');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const token = generateSecureToken(24);
      let passwordHash: string | undefined = undefined;

      if (enablePassword) {
        passwordHash = await hashPassword(password.trim());
      }

      const hours = parseInt(expiryHours, 10);
      const expDate = new Date(Date.now() + hours * 60 * 60 * 1000);

      // Create QuickDrop package record
      const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
      const shareId = `quickdrop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const shareItem: ShareRecord = {
        id: shareId,
        fileId: shareId,
        ownerId: user.uid,
        ownerEmail: user.email || '',
        shareToken: token,
        fileName: selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles[0].name} (+${selectedFiles.length - 1} more)`,
        fileSize: totalSize,
        mimeType: selectedFiles.length === 1 ? selectedFiles[0].type : 'application/zip-bundle',
        storageKey: `quickdrop/${user.uid}/${token}`,
        expiresAt: expDate.toISOString(),
        isPasswordProtected: enablePassword,
        ...(passwordHash ? { passwordHash } : {}),
        accessCount: 0,
        createdAt: new Date().toISOString(),
      };

      await createShareRecord(shareItem);

      const url = `${window.location.origin}/s/${token}`;
      setGeneratedLink(url);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize QuickDrop package.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>INFCLOUD QuickDrop</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Instant ephemeral multi-file transfers with automatic zero-trace expiration.
        </p>
      </div>

      <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-2xl backdrop-blur-xl">
        {generatedLink ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">QuickDrop Link Active</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Recipients can instantly access this bundle until expiration.
              </p>
            </div>

            <div className="flex items-center gap-2 p-2 bg-zinc-950 rounded-2xl border border-zinc-800">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 bg-transparent text-xs text-zinc-200 outline-none px-2 font-mono truncate"
              />
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setGeneratedLink(null);
                setSelectedFiles([]);
              }}
              className="py-2.5 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
            >
              Start Another QuickDrop
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateQuickDrop} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200">
                {error}
              </div>
            )}

            {/* Dropzone */}
            <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-3xl p-6 text-center cursor-pointer bg-zinc-950/60 transition group">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:scale-110 transition">
                  <Upload className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-xs font-semibold text-zinc-200">
                  Select or drag files here
                </span>
                <span className="text-[11px] text-zinc-500">
                  Universal file support · Multiple files permitted
                </span>
              </div>
            </div>

            {/* Selected files chips */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                  >
                    <span className="text-zinc-200 truncate max-w-xs">{f.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-zinc-500">{formatBytes(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expiry Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 mb-2">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Self-Destruct Timeout</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['1', '6', '24', '72'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setExpiryHours(h)}
                    className={`py-2 text-xs rounded-xl border font-semibold transition ${
                      expiryHours === h
                        ? 'bg-zinc-800 border-amber-500 text-white shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {h === '72' ? '3 Days' : `${h} Hour${h === '1' ? '' : 's'}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Password protection */}
            <div className="pt-2 border-t border-zinc-800">
              <label className="flex items-center justify-between cursor-pointer mb-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Passphrase Protection</span>
                </span>
                <input
                  type="checkbox"
                  checked={enablePassword}
                  onChange={(e) => setEnablePassword(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0"
                />
              </label>

              {enablePassword && (
                <input
                  type="password"
                  placeholder="Passphrase required to access"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={loading || selectedFiles.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-xs font-bold text-zinc-950 shadow-lg shadow-amber-950/40 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span>Generating QuickDrop Package...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-zinc-950" />
                  <span>Create QuickDrop Link</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
