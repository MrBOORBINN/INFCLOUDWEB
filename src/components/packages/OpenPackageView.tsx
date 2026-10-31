import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Package,
  Download,
  Eye,
  Check,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  FolderArchive,
  RefreshCw,
  Folder,
  ChevronRight,
  ShieldCheck,
  HardDrive,
  Copy,
} from 'lucide-react';
import { FilePackage, PackageItemFile } from '../../types';
import { formatBytes, formatDate, getFileCategory } from '../../lib/utils';
import { getPackageByAccessCode, validatePackageCodeFormat } from '../../lib/database';
import { downloadPackageAsZip, ZipProgressPayload } from '../../lib/packageZip';
import { downloadFileBlob, getStorageUrl } from '../../lib/storage';

interface OpenPackageViewProps {
  initialCode?: string;
  onPreviewFile?: (file: PackageItemFile, fileList: PackageItemFile[]) => void;
  onBackToApp?: () => void;
}

export const OpenPackageView: React.FC<OpenPackageViewProps> = ({
  initialCode = '',
  onPreviewFile,
  onBackToApp,
}) => {
  const [accessCode, setAccessCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedPackage, setLoadedPackage] = useState<FilePackage | null>(null);

  // ZIP download progress state
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipProgressPayload | null>(null);

  // Update access code when initialCode changes and auto lookup
  useEffect(() => {
    if (initialCode) {
      const clean = initialCode.trim().toLowerCase();
      setAccessCode(clean);
      if (clean.length === 8) {
        handleLookup(clean);
      }
    }
  }, [initialCode]);

  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const clean = text.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
        if (clean) {
          setAccessCode(clean);
          setError(null);
          if (clean.length === 8) {
            handleLookup(clean);
          }
        }
      }
    } catch {
      // Permission denied
    }
  };

  const handleLookup = async (codeToLookup?: string) => {
    const targetCode = (codeToLookup || accessCode).trim().toLowerCase();
    setError(null);

    if (!targetCode) {
      setError('Please enter an 8-character access code.');
      return;
    }

    if (targetCode.length !== 8) {
      setError('Access codes must be exactly 8 characters long (e.g., o7w7la0b).');
      return;
    }

    setLoading(true);

    try {
      const pkg = await getPackageByAccessCode(targetCode);
      setLoadedPackage(pkg);
    } catch (err: any) {
      console.warn('Package access error:', err);
      setLoadedPackage(null);
      setError(err?.message || 'Invalid or revoked package access code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!loadedPackage) return;
    setIsZipping(true);
    setZipProgress(null);

    try {
      await downloadPackageAsZip(loadedPackage, (progress) => {
        setZipProgress(progress);
      });
    } catch (err: any) {
      console.error('ZIP download error:', err);
      alert(`ZIP Download Failed: ${err?.message || 'Error compiling archive'}`);
    } finally {
      setIsZipping(false);
      setZipProgress(null);
    }
  };

  const handleDownloadSingleFile = async (item: PackageItemFile) => {
    try {
      let downloadUrl = item.downloadUrl;
      if (!downloadUrl) {
        downloadUrl = (await getStorageUrl(item.storageKey)) || undefined;
      }
      downloadFileBlob(item.storageKey, downloadUrl, item.name);
    } catch (err: any) {
      alert(`Download failed: ${err?.message || 'Storage error'}`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white">Open Shared Package</h2>
            <p className="text-xs text-zinc-400">
              Enter any 8-character access code to view and download packages without an account
            </p>
          </div>
        </div>

        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
          >
            ← Back to Storage
          </button>
        )}
      </div>

      {/* Code Input Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800 shadow-xl space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
            Enter 8-Character Package Access Code
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                maxLength={8}
                value={accessCode}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                  setAccessCode(val);
                  setError(null);
                  if (val.length === 8) {
                    handleLookup(val);
                  }
                }}
                placeholder="e.g. o7w7la0b"
                className="w-full px-5 py-3.5 pr-24 rounded-2xl bg-black/60 border-2 border-zinc-700 text-white font-mono text-xl sm:text-2xl font-bold tracking-[0.2em] placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 transition shadow-inner"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold transition"
                  title="Paste 8-character code from clipboard"
                >
                  Paste
                </button>
                <span className="text-xs font-mono text-zinc-500 pointer-events-none">
                  {accessCode.length}/8
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || accessCode.length !== 8}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-bold text-sm transition shadow-lg shadow-sky-950/40 active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Unlock Package</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              Codes contain exactly 3 digits and 5 lowercase letters (e.g. <strong className="font-mono text-zinc-400">o7w7la0b</strong>). No links needed.
            </span>
            {loadedPackage && (
              <button
                type="button"
                onClick={() => {
                  setLoadedPackage(null);
                  setAccessCode('');
                  setError(null);
                }}
                className="text-sky-400 hover:text-sky-300 font-semibold"
              >
                Clear / Enter another code
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>

      {/* UNLOCKED PACKAGE CONTENTS VIEW */}
      {loadedPackage && (
        <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header Summary */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold border border-emerald-500/30">
                  CODE: {loadedPackage.accessCode}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-xs font-medium">
                  {loadedPackage.totalFiles} files
                </span>
                <span className="text-xs text-zinc-400">
                  {formatBytes(loadedPackage.totalSize)}
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold text-white">
                {loadedPackage.name}
              </h3>
              {loadedPackage.description && (
                <p className="text-xs text-zinc-400 max-w-xl">
                  {loadedPackage.description}
                </p>
              )}
              <p className="text-[11px] text-zinc-500 pt-1">
                Shared by {loadedPackage.ownerDisplayName || 'INFCLOUD User'} · Created on {formatDate(loadedPackage.createdAt)}
              </p>
            </div>

            {/* ZIP Download Action */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white font-bold text-xs transition shadow-xl shadow-sky-950/40 active:scale-95"
              >
                {isZipping ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      {zipProgress ? `${zipProgress.currentFileName} (${zipProgress.percent}%)` : 'Preparing ZIP...'}
                    </span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-4 h-4" />
                    <span>Download Entire Package (ZIP)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ZIP Progress Bar when Active */}
          {isZipping && zipProgress && (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-sky-500/30 space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span className="font-semibold text-sky-400 truncate max-w-xs sm:max-w-md">
                  {zipProgress.currentFileName}
                </span>
                <span className="font-mono">{zipProgress.percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-150"
                  style={{ width: `${zipProgress.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Packaging file {zipProgress.currentFileIndex} of {zipProgress.totalFiles} while preserving folder hierarchy...
              </p>
            </div>
          )}

          {/* Files List with Folder Hierarchy */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Files in this Package ({loadedPackage.items.length})
            </h4>

            <div className="divide-y divide-zinc-800/80 rounded-2xl bg-zinc-950/80 border border-zinc-800 overflow-hidden">
              {loadedPackage.items.map((item, idx) => {
                const category = getFileCategory(item.mimeType, item.name);
                const hasFolder = item.path && item.path.includes('/');

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 hover:bg-zinc-900/60 transition group"
                  >
                    <div
                      onClick={() => onPreviewFile && onPreviewFile(item, loadedPackage.items)}
                      className="flex items-center gap-3 overflow-hidden min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-zinc-800/80 text-sky-400 shrink-0 border border-zinc-700/60 group-hover:border-sky-500/50 transition">
                        <FileText className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-200 group-hover:text-sky-400 transition truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                          <span>{formatBytes(item.size)}</span>
                          {hasFolder && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-zinc-400 truncate max-w-xs">
                                📁 {item.path}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {onPreviewFile && (
                        <button
                          onClick={() => onPreviewFile(item, loadedPackage.items)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
                          title="Preview in INFCLOUD"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Preview</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadSingleFile(item)}
                        className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
