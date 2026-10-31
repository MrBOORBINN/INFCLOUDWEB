import React, { useState, useEffect } from 'react';
import {
  Archive,
  X,
  FileText,
  CheckCircle2,
  Download,
  Cloud,
  Loader2,
  HardDrive,
  Sparkles,
  Percent,
} from 'lucide-react';
import { FileItem } from '../../types';
import { formatBytes } from '../../lib/utils';
import { createCompressedZipBlob, triggerBrowserDownload } from '../../lib/storage';

interface CompressModalProps {
  isOpen: boolean;
  files: FileItem[];
  currentFolderId: string | null;
  onClose: () => void;
  onCompressedAndUploaded?: (compressedFile: File, targetFolderId: string | null) => Promise<void> | void;
}

export const CompressModal: React.FC<CompressModalProps> = ({
  isOpen,
  files,
  currentFolderId,
  onClose,
  onCompressedAndUploaded,
}) => {
  const [archiveName, setArchiveName] = useState('');
  const [saveToCloud, setSaveToCloud] = useState(true);
  const [downloadLocal, setDownloadLocal] = useState(true);

  // Compression state
  const [isCompressing, setIsCompressing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [completedStats, setCompletedStats] = useState<{
    originalBytes: number;
    compressedBytes: number;
    savedPercent: number;
    archiveName: string;
  } | null>(null);

  // Initialize archive name when files change
  useEffect(() => {
    if (files.length === 1) {
      const baseName = files[0].name.replace(/\.[^/.]+$/, '');
      setArchiveName(`${baseName}_compressed.zip`);
    } else if (files.length > 1) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      setArchiveName(`INFCLOUD_Archive_${dateStr}.zip`);
    } else {
      setArchiveName('Archive.zip');
    }
    setCompletedStats(null);
    setIsCompressing(false);
    setProgressPercent(0);
    setStatusMessage('');
  }, [files, isOpen]);

  if (!isOpen || files.length === 0) return null;

  const totalOriginalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  const handleStartCompression = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalName = archiveName.trim();
    if (!finalName) {
      finalName = 'INFCLOUD_Archive.zip';
    }
    if (!finalName.toLowerCase().endsWith('.zip')) {
      finalName += '.zip';
    }

    setIsCompressing(true);
    setProgressPercent(5);
    setStatusMessage('Preparing file payloads for compression...');

    try {
      const { zipBlob, totalOriginalBytes: realOriginal, compressedBytes } =
        await createCompressedZipBlob(
          files.map((f) => ({
            name: f.name,
            storageKey: f.storageKey,
            downloadUrl: f.downloadUrl,
            size: f.size,
          })),
          (percent, msg) => {
            setProgressPercent(percent);
            setStatusMessage(msg);
          }
        );

      const savedBytes = Math.max(0, realOriginal - compressedBytes);
      const savedPercent = realOriginal > 0 ? Math.round((savedBytes / realOriginal) * 100) : 0;

      // 1. Download to device if checked
      if (downloadLocal) {
        setStatusMessage('Starting instant local download...');
        const localUrl = URL.createObjectURL(zipBlob);
        triggerBrowserDownload(localUrl, finalName);
        setTimeout(() => URL.revokeObjectURL(localUrl), 15000);
      }

      // 2. Upload to INFCLOUD cloud storage if checked
      if (saveToCloud && onCompressedAndUploaded) {
        setStatusMessage('Uploading compressed archive to INFCLOUD cloud storage...');
        const compressedFile = new File([zipBlob], finalName, {
          type: 'application/zip',
          lastModified: Date.now(),
        });
        await onCompressedAndUploaded(compressedFile, currentFolderId);
      }

      setCompletedStats({
        originalBytes: realOriginal,
        compressedBytes,
        savedPercent,
        archiveName: finalName,
      });
      setIsCompressing(false);
    } catch (err: any) {
      alert('Compression error: ' + (err?.message || 'Failed to generate compressed ZIP archive.'));
      setIsCompressing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100 ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {completedStats ? 'Archive Created' : 'Compress to ZIP'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {files.length} {files.length === 1 ? 'file' : 'files'} selected (
                {formatBytes(totalOriginalBytes)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCompressing}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COMPLETED SUCCESS VIEW */}
        {completedStats ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-center space-y-2">
              <div className="inline-flex p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">{completedStats.archiveName}</h4>
              <p className="text-xs text-zinc-300">
                Successfully compressed and packaged with DEFLATE!
              </p>

              {/* Stats Card */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-900/60 text-center text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Original</span>
                  <strong className="text-zinc-200">
                    {formatBytes(completedStats.originalBytes)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Compressed</span>
                  <strong className="text-emerald-400 font-mono">
                    {formatBytes(completedStats.compressedBytes)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Storage Saved</span>
                  <strong className="text-purple-300 font-mono">
                    {completedStats.savedPercent > 0 ? `${completedStats.savedPercent}%` : 'Optimized'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-400 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
              {saveToCloud && (
                <div className="flex items-center gap-2 text-sky-400 font-medium">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Stored in current cloud folder for instant sharing and access</span>
                </div>
              )}
              {downloadLocal && (
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <Download className="w-3.5 h-3.5" />
                  <span>Triggered browser download to your device</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg transition active:scale-95"
            >
              Done
            </button>
          </div>
        ) : (
          /* FORM VIEW */
          <form onSubmit={handleStartCompression} className="space-y-4">
            {/* Archive Name Input */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Archive Name (.zip)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={isCompressing}
                  value={archiveName}
                  onChange={(e) => setArchiveName(e.target.value)}
                  placeholder="e.g. ProjectFiles.zip"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition font-medium"
                />
              </div>
            </div>

            {/* Selected Files Preview List */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Files included ({files.length}):
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-zinc-950/70 border border-zinc-800/80 rounded-xl text-xs">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-zinc-300 gap-2">
                    <span className="truncate max-w-[240px] text-[11px]">{f.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                      {formatBytes(f.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 pt-1 border-t border-zinc-800/80">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  disabled={isCompressing}
                  checked={saveToCloud}
                  onChange={(e) => setSaveToCloud(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900"
                />
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-zinc-200 font-medium">Save to INFCLOUD Storage</span>
                </div>
              </label>
              <p className="text-[10px] text-zinc-500 pl-6 -mt-1">
                Optimizes your storage quota and allows sharing the zip file via INFCLOUD links.
              </p>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none pt-1">
                <input
                  type="checkbox"
                  disabled={isCompressing}
                  checked={downloadLocal}
                  onChange={(e) => setDownloadLocal(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900"
                />
                <div className="flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-zinc-200 font-medium">Download ZIP to device</span>
                </div>
              </label>
            </div>

            {/* Progress Bar when compressing */}
            {isCompressing && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{statusMessage || 'Compressing...'}</span>
                  </span>
                  <span className="font-mono text-purple-400">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-150"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isCompressing}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCompressing || (!saveToCloud && !downloadLocal)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition active:scale-95 disabled:opacity-50"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Compressing...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>Compress Files</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
