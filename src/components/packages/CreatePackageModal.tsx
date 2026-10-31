import React, { useState, useMemo } from 'react';
import {
  X,
  Package,
  Check,
  Copy,
  Folder,
  FileText,
  Trash2,
  Plus,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  KeyRound,
  Calendar,
} from 'lucide-react';
import { FileItem, FolderItem, FilePackage, PackageItemFile } from '../../types';
import { formatBytes, getFileCategory } from '../../lib/utils';
import { createPackageRecord } from '../../lib/database';

interface CreatePackageModalProps {
  files: FileItem[];
  folders: FolderItem[];
  preselectedFileIds?: string[];
  userId: string;
  userDisplayName?: string;
  userEmail?: string;
  onClose: () => void;
  onPackageCreated?: (pkg: FilePackage) => void;
  onTestCode?: (code: string) => void;
}

export const CreatePackageModal: React.FC<CreatePackageModalProps> = ({
  files,
  folders,
  preselectedFileIds = [],
  userId,
  userDisplayName,
  userEmail,
  onClose,
  onPackageCreated,
  onTestCode,
}) => {
  const [packageName, setPackageName] = useState('My INFCLOUD Package');
  const [description, setDescription] = useState('');
  const [expiryOption, setExpiryOption] = useState<'never' | '1day' | '7days' | '30days'>('never');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preselectedFileIds));
  const [searchFilter, setSearchFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state showing the 8-character code (NO URL)
  const [createdPackage, setCreatedPackage] = useState<FilePackage | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Build folder map to calculate relative paths for preserving folder hierarchies
  const folderPathMap = useMemo(() => {
    const map = new Map<string, string>();
    const folderById = new Map<string, FolderItem>();
    folders.forEach((f) => folderById.set(f.id, f));

    const getPath = (folderId: string | null): string => {
      if (!folderId) return '';
      if (map.has(folderId)) return map.get(folderId)!;
      const folder = folderById.get(folderId);
      if (!folder) return '';
      const parentPath = getPath(folder.parentFolderId);
      const full = parentPath ? `${parentPath}/${folder.name}` : folder.name;
      map.set(folderId, full);
      return full;
    };

    folders.forEach((f) => getPath(f.id));
    return map;
  }, [folders]);

  // Available files that are not in trash
  const availableFiles = useMemo(() => {
    return files.filter((f) => !f.isTrashed);
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!searchFilter.trim()) return availableFiles;
    const q = searchFilter.toLowerCase();
    return availableFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [availableFiles, searchFilter]);

  // Selected items with full path preserved
  const packageItems: PackageItemFile[] = useMemo(() => {
    return availableFiles
      .filter((f) => selectedIds.has(f.id))
      .map((f) => {
        const folderPath = f.parentFolderId ? folderPathMap.get(f.parentFolderId) : '';
        const itemPath = folderPath ? `${folderPath}/${f.name}` : f.name;
        return {
          fileId: f.id,
          name: f.name,
          originalName: f.originalName || f.name,
          path: itemPath,
          size: f.size,
          mimeType: f.mimeType,
          storageKey: f.storageKey,
          downloadUrl: f.downloadUrl,
          storageProvider: f.storageProvider,
        };
      });
  }, [availableFiles, selectedIds, folderPathMap]);

  const totalPackageSize = useMemo(() => {
    return packageItems.reduce((acc, item) => acc + item.size, 0);
  }, [packageItems]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim()) {
      setError('Please provide a package name.');
      return;
    }
    if (packageItems.length === 0) {
      setError('Please select at least one file to include in the package.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let expiresAt: string | null = null;
      if (expiryOption === '1day') {
        expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      } else if (expiryOption === '7days') {
        expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      } else if (expiryOption === '30days') {
        expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      }

      const created = await createPackageRecord({
        ownerId: userId,
        ownerDisplayName: userDisplayName || 'INFCLOUD User',
        ownerEmail: userEmail,
        name: packageName.trim(),
        description: description.trim(),
        items: packageItems,
        totalFiles: packageItems.length,
        totalSize: totalPackageSize,
        expiresAt,
      });

      setCreatedPackage(created);
      if (onPackageCreated) {
        onPackageCreated(created);
      }
    } catch (err: any) {
      console.error('Failed to create package:', err);
      setError(err?.message || 'Failed to create package. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAccessCode = () => {
    if (createdPackage?.accessCode) {
      navigator.clipboard.writeText(createdPackage.accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {createdPackage ? 'Package Created Successfully' : 'Create File Package'}
              </h3>
              <p className="text-xs text-zinc-400">
                {createdPackage
                  ? 'Your unique 8-character access code is ready'
                  : 'Bundle files & folders with preserved hierarchy'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {createdPackage ? (
          /* SUCCESS SCREEN WITH 8-CHARACTER CODE (NO URL) */
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white">Package Access Code Ready</h4>
              <p className="text-xs text-zinc-400 max-w-md">
                Anyone with this 8-character code can open and download <strong className="text-zinc-200">"{createdPackage.name}"</strong> directly inside INFCLOUD without logging in.
              </p>
            </div>

            {/* 8-CHARACTER ACCESS CODE DISPLAY */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-900/60 border-2 border-sky-500/40 shadow-xl space-y-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-widest">
                <KeyRound className="w-4 h-4" />
                <span>8-Character Package Access Code</span>
              </div>

              {/* Large Monospace Access Code */}
              <div className="inline-block px-6 py-3 rounded-2xl bg-black/60 border border-zinc-700 font-mono text-3xl sm:text-4xl font-extrabold tracking-[0.25em] text-white selection:bg-sky-500 selection:text-white shadow-inner">
                {createdPackage.accessCode}
              </div>

              <div>
                <button
                  type="button"
                  onClick={copyAccessCode}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm transition shadow-lg shadow-sky-950/40 active:scale-95"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Access Code Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <p className="text-[11px] text-zinc-400">
                Contains exactly 5 lowercase letters and 3 digits. No sharing link is needed.
              </p>
            </div>

            {/* Package Summary */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Total Files:</span>
                <span className="font-semibold text-zinc-200">{createdPackage.totalFiles} files</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Total Package Size:</span>
                <span className="font-semibold text-zinc-200">{formatBytes(createdPackage.totalSize)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Folder Structure:</span>
                <span className="font-semibold text-emerald-400">Preserved in ZIP download</span>
              </div>
              {createdPackage.expiresAt && (
                <div className="flex justify-between text-zinc-400">
                  <span>Expires:</span>
                  <span className="font-semibold text-amber-400">
                    {new Date(createdPackage.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 gap-3">
              {onTestCode ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTestCode(createdPackage.accessCode);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/40 text-xs font-bold transition active:scale-95"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Open Package with this Code →</span>
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* CREATION FORM */
          <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 md:p-6 space-y-5 overflow-y-auto flex-1">
              {error && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Package Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="e.g. Q3 Financials & Assets"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-sm focus:outline-none focus:border-sky-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide notes or context for the recipient..."
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs focus:outline-none focus:border-sky-500 transition resize-none"
                  />
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Code Expiration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'never', label: 'Never' },
                      { id: '1day', label: '24 Hours' },
                      { id: '7days', label: '7 Days' },
                      { id: '30days', label: '30 Days' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setExpiryOption(opt.id as any)}
                        className={`py-2 px-2 rounded-xl text-xs font-medium border transition ${
                          expiryOption === opt.id
                            ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* File Selector */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Select Package Contents</span>
                    <p className="text-[11px] text-zinc-400">
                      {selectedIds.size} files selected ({formatBytes(totalPackageSize)})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-zinc-600">·</span>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-[11px] text-zinc-400 hover:text-zinc-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Filter Search */}
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search files to include..."
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />

                {/* File list with checkboxes & path preview */}
                <div className="max-h-56 overflow-y-auto space-y-1 rounded-2xl bg-zinc-900/60 p-2 border border-zinc-800">
                  {filteredFiles.length === 0 ? (
                    <div className="text-center py-6 text-xs text-zinc-500">
                      No matching files found in your storage.
                    </div>
                  ) : (
                    filteredFiles.map((file) => {
                      const isSelected = selectedIds.has(file.id);
                      const folderPath = file.parentFolderId ? folderPathMap.get(file.parentFolderId) : '';
                      const displayPath = folderPath ? `${folderPath}/${file.name}` : file.name;

                      return (
                        <div
                          key={file.id}
                          onClick={() => toggleSelect(file.id)}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition ${
                            isSelected
                              ? 'bg-sky-500/15 border border-sky-500/30 text-white'
                              : 'hover:bg-zinc-800/60 text-zinc-300 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-sky-500 focus:ring-0 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{file.name}</p>
                              {folderPath && (
                                <p className="text-[10px] text-zinc-400 truncate font-mono">
                                  📁 {folderPath}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-zinc-400 shrink-0 ml-2 font-mono">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 shrink-0">
              <span className="text-xs text-zinc-400">
                {packageItems.length} items · {formatBytes(totalPackageSize)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || packageItems.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-sky-950/40 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Create Package & Generate Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
