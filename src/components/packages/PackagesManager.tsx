import React, { useState } from 'react';
import {
  Package,
  Plus,
  KeyRound,
  Copy,
  Check,
  Download,
  Trash2,
  FolderArchive,
  Eye,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  X,
} from 'lucide-react';
import { FilePackage, PackageItemFile } from '../../types';
import { formatBytes, formatDate } from '../../lib/utils';
import { togglePackageRevocation, deletePackageRecord } from '../../lib/database';
import { downloadPackageAsZip, ZipProgressPayload } from '../../lib/packageZip';

interface PackagesManagerProps {
  packages: FilePackage[];
  userId: string;
  onCreatePackage: () => void;
  onOpenAccessCodeView: (code?: string) => void;
  onPreviewFile?: (file: PackageItemFile, fileList: PackageItemFile[]) => void;
}

export const PackagesManager: React.FC<PackagesManagerProps> = ({
  packages,
  userId,
  onCreatePackage,
  onOpenAccessCodeView,
  onPreviewFile,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activePackageModal, setActivePackageModal] = useState<FilePackage | null>(null);
  const [zippingPackageId, setZippingPackageId] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<ZipProgressPayload | null>(null);

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(search.toLowerCase()) ||
    pkg.accessCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyCode = (pkg: FilePackage) => {
    navigator.clipboard.writeText(pkg.accessCode);
    setCopiedId(pkg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleRevoke = async (pkg: FilePackage) => {
    try {
      await togglePackageRevocation(pkg.id, pkg.isRevoked, userId);
    } catch (err: any) {
      alert(`Action failed: ${err?.message || 'Permission denied'}`);
    }
  };

  const handleDelete = async (pkg: FilePackage) => {
    if (confirm(`Are you sure you want to permanently delete package "${pkg.name}"? The 8-character access code will stop working immediately.`)) {
      try {
        await deletePackageRecord(pkg.id, userId);
        if (activePackageModal?.id === pkg.id) {
          setActivePackageModal(null);
        }
      } catch (err: any) {
        alert(`Deletion failed: ${err?.message || 'Error deleting package'}`);
      }
    }
  };

  const handleDownloadZip = async (pkg: FilePackage) => {
    setZippingPackageId(pkg.id);
    setZipProgress(null);
    try {
      await downloadPackageAsZip(pkg, (progress) => {
        setZipProgress(progress);
      });
    } catch (err: any) {
      alert(`ZIP Download failed: ${err?.message}`);
    } finally {
      setZippingPackageId(null);
      setZipProgress(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white">File Packages & Access Codes</h2>
            <p className="text-xs text-zinc-400">
              Multi-file folders bundled and shared securely via random 8-character access codes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAccessCodeView()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition border border-zinc-700/60 active:scale-95"
          >
            <KeyRound className="w-4 h-4 text-sky-400" />
            <span>Enter Access Code</span>
          </button>

          <button
            onClick={onCreatePackage}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-lg shadow-sky-950/40 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Package</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages by name or 8-character code..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Packages Grid / List */}
      {filteredPackages.length === 0 ? (
        <div className="flex flex-col items-center text-center p-12 rounded-3xl bg-zinc-900/30 border border-zinc-800/80">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-500 mb-4">
            <Package className="w-8 h-8 text-sky-400" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">No Packages Created Yet</h4>
          <p className="text-xs text-zinc-400 max-w-sm mb-5">
            Organize files and folders into downloadable ZIP packages and generate private 8-character access codes.
          </p>
          <button
            onClick={onCreatePackage}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Package</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => {
            const isCopied = copiedId === pkg.id;
            const isZipping = zippingPackageId === pkg.id;

            return (
              <div
                key={pkg.id}
                className="flex flex-col justify-between p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition shadow-xl space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                        pkg.isRevoked
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {pkg.isRevoked ? 'Revoked' : 'Active'}
                    </span>

                    <span className="text-[11px] text-zinc-500">
                      {formatDate(pkg.createdAt)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white truncate">{pkg.name}</h3>
                    {pkg.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1">{pkg.description}</p>
                    )}
                  </div>

                  {/* 8-Character Access Code with Copy Button */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/50 border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                      <span className="font-mono text-sm font-bold tracking-widest text-zinc-100">
                        {pkg.accessCode}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyCode(pkg)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition"
                      title="Copy access code"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                    <span>
                      {pkg.totalFiles} files ({formatBytes(pkg.totalSize)})
                    </span>
                    <span>{pkg.accessCount || 0} accesses</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 gap-1.5">
                  <button
                    onClick={() => onOpenAccessCodeView(pkg.accessCode)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition"
                    title="Unlock package with this 8-character code"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Open Code</span>
                  </button>

                  <button
                    onClick={() => setActivePackageModal(pkg)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => handleDownloadZip(pkg)}
                    disabled={isZipping}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-semibold transition border border-sky-500/40"
                    title="Download full package as ZIP"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>{isZipping ? 'Zipping...' : 'ZIP'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleRevoke(pkg)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
                      pkg.isRevoked
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                    title={pkg.isRevoked ? 'Activate Access Code' : 'Revoke Access Code'}
                  >
                    {pkg.isRevoked ? 'Enable' : 'Revoke'}
                  </button>

                  <button
                    onClick={() => handleDelete(pkg)}
                    className="p-1.5 rounded-xl bg-zinc-800/60 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition"
                    title="Delete package"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Package Detail Modal */}
      {activePackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="relative flex flex-col w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{activePackageModal.name}</h3>
                  <p className="text-xs text-zinc-400">
                    CODE: <strong className="font-mono text-zinc-200">{activePackageModal.accessCode}</strong> · {activePackageModal.totalFiles} files ({formatBytes(activePackageModal.totalSize)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePackageModal(null)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Packaged Files & Folder Structure
                </h4>
                <div className="divide-y divide-zinc-800 rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
                  {activePackageModal.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-zinc-500 font-mono">{idx + 1}.</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-200 truncate">{item.name}</p>
                          {item.path && item.path !== item.name && (
                            <p className="text-[10px] text-zinc-400 font-mono">📁 {item.path}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-zinc-400 font-mono">{formatBytes(item.size)}</span>
                        {onPreviewFile && (
                          <button
                            onClick={() => {
                              onPreviewFile(item, activePackageModal.items);
                              setActivePackageModal(null);
                            }}
                            className="p-1 rounded bg-zinc-800 text-zinc-300 hover:text-white"
                            title="Preview file"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 shrink-0">
              <button
                onClick={() => handleCopyCode(activePackageModal)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
              >
                {copiedId === activePackageModal.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>Copy Access Code</span>
              </button>

              <button
                onClick={() => {
                  handleDownloadZip(activePackageModal);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-lg"
              >
                <FolderArchive className="w-4 h-4" />
                <span>Download Entire Package (ZIP)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
