import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FolderPlus,
  Grid,
  List,
  ArrowUpDown,
  MoreVertical,
  Star,
  Trash2,
  Download,
  Share2,
  Edit2,
  FolderInput,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  HardDrive,
  ChevronRight,
  Home,
  CheckSquare,
  Square,
  MinusSquare,
  Lock,
  X,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { FileItem, FolderItem, ViewMode, SortField, SortDirection, FileCategory } from '../../types';
import { formatBytes, formatDate, getFileCategory } from '../../lib/utils';
import { downloadFileBlob, downloadFilesAsZip } from '../../lib/storage';
import {
  batchSoftDeleteFiles,
  batchMoveFiles,
  batchToggleVault,
  batchToggleStar,
} from '../../lib/database';
import { useAuth } from '../../context/AuthContext';
import { CompressModal } from '../modals/CompressModal';

interface FileManagerProps {
  files: FileItem[];
  folders: FolderItem[];
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  selectedCategory: FileCategory;
  setSelectedCategory: (cat: FileCategory) => void;
  searchQuery: string;
  onPreviewFile: (file: FileItem) => void;
  onShareFile: (file: FileItem) => void;
  onToggleStar: (fileId: string, current: boolean) => void;
  onToggleVault: (fileId: string, current: boolean, name: string) => void;
  onDeleteFile: (file: FileItem) => void;
  onRenameFile: (file: FileItem) => void;
  onMoveFile: (file: FileItem) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folder: FolderItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  onOpenUpload: () => void;
  onBatchDeleteFiles?: (files: FileItem[]) => void;
  onBatchMoveFiles?: (files: FileItem[], targetFolderId: string | null) => void;
  onBatchToggleVault?: (files: FileItem[], isVault: boolean) => void;
  onUploadFiles?: (files: File[], targetFolderId?: string | null) => void;
  onCreatePackage?: (selectedFileIds: string[]) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  files,
  folders,
  currentFolderId,
  setCurrentFolderId,
  onCreatePackage,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  onPreviewFile,
  onShareFile,
  onToggleStar,
  onToggleVault,
  onDeleteFile,
  onRenameFile,
  onMoveFile,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenUpload,
  onBatchDeleteFiles,
  onBatchMoveFiles,
  onBatchToggleVault,
  onUploadFiles,
}) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Bulk Selection State
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Menus and Modals State
  const [activeMenuFileId, setActiveMenuFileId] = useState<string | null>(null);
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Compress Modal State
  const [showCompressModal, setShowCompressModal] = useState(false);
  const [compressTargetFiles, setCompressTargetFiles] = useState<FileItem[]>([]);

  const handleOpenCompress = (filesToCompress: FileItem[]) => {
    setCompressTargetFiles(filesToCompress);
    setShowCompressModal(true);
  };

  // Batch Modals
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchTargetFolderId, setBatchTargetFolderId] = useState<string | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // Filter out trashed and vault items from general browser
  const activeFolders = folders.filter((f) => !f.isTrashed && !f.isVault && f.parentFolderId === currentFolderId);

  let activeFiles = files.filter((f) => !f.isTrashed && !f.isVault);

  // If inside a folder, only show files in that folder; if at root and no search/category filter, show root files
  if (currentFolderId) {
    activeFiles = activeFiles.filter((f) => f.parentFolderId === currentFolderId);
  } else if (selectedCategory === 'all' && !searchQuery) {
    activeFiles = activeFiles.filter((f) => f.parentFolderId === null);
  }

  // Category filter
  if (selectedCategory !== 'all') {
    activeFiles = activeFiles.filter((f) => getFileCategory(f.mimeType, f.name) === selectedCategory);
  }

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    activeFiles = activeFiles.filter((f) => f.name.toLowerCase().includes(q));
  }

  // Sorting
  activeFiles.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'size') {
      comparison = a.size - b.size;
    } else {
      comparison = new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Selected files lookup and calculations
  const selectedFiles = useMemo(() => {
    const idSet = new Set(selectedFileIds);
    return activeFiles.filter((f) => idSet.has(f.id));
  }, [selectedFileIds, activeFiles]);

  const totalSelectedSize = useMemo(() => {
    return selectedFiles.reduce((acc, f) => acc + f.size, 0);
  }, [selectedFiles]);

  const areAllSelected = activeFiles.length > 0 && selectedFileIds.length === activeFiles.length;
  const isPartiallySelected = selectedFileIds.length > 0 && selectedFileIds.length < activeFiles.length;

  // Clear selections when navigating to another folder or category
  useEffect(() => {
    setSelectedFileIds([]);
    setLastSelectedId(null);
  }, [currentFolderId, selectedCategory]);

  // Keyboard shortcut: Escape clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showBatchMoveModal) {
          setShowBatchMoveModal(false);
        } else if (showBatchDeleteConfirm) {
          setShowBatchDeleteConfirm(false);
        } else if (selectedFileIds.length > 0) {
          setSelectedFileIds([]);
          setLastSelectedId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFileIds, showBatchMoveModal, showBatchDeleteConfirm]);

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Home' }];
    if (!currentFolderId) return crumbs;

    const findFolder = (id: string): FolderItem | undefined => folders.find((f) => f.id === id);
    const path: { id: string; name: string }[] = [];
    let current = findFolder(currentFolderId);

    while (current) {
      path.unshift({ id: current.id, name: current.name });
      current = current.parentFolderId ? findFolder(current.parentFolderId) : undefined;
    }

    return [...crumbs, ...path];
  };

  const breadcrumbs = getBreadcrumbs();

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedFileIds.length === activeFiles.length) {
      setSelectedFileIds([]);
      setLastSelectedId(null);
    } else {
      setSelectedFileIds(activeFiles.map((f) => f.id));
      setLastSelectedId(activeFiles[activeFiles.length - 1]?.id || null);
    }
  };

  const handleClearSelection = () => {
    setSelectedFileIds([]);
    setLastSelectedId(null);
  };

  const handleToggleSelect = (fileId: string, shiftKey = false) => {
    if (shiftKey && lastSelectedId && lastSelectedId !== fileId) {
      const lastIndex = activeFiles.findIndex((f) => f.id === lastSelectedId);
      const currentIndex = activeFiles.findIndex((f) => f.id === fileId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = activeFiles.slice(start, end + 1).map((f) => f.id);

        setSelectedFileIds((prev) => {
          const union = new Set([...prev, ...rangeIds]);
          return Array.from(union);
        });
        setLastSelectedId(fileId);
        return;
      }
    }

    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
    setLastSelectedId(fileId);
  };

  // Bulk ZIP Download
  const handleBulkZipDownload = async () => {
    if (selectedFiles.length === 0) return;
    setIsZipping(true);
    try {
      await downloadFilesAsZip(
        selectedFiles.map((f) => ({ name: f.name, storageKey: f.storageKey, downloadUrl: f.downloadUrl })),
        `INFCLOUD_${selectedFiles.length}_Files.zip`
      );
    } catch (e: any) {
      alert('ZIP generation note: ' + (e?.message || 'Failed to generate archive.'));
    } finally {
      setIsZipping(false);
    }
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    setBatchActionLoading(true);
    try {
      if (onBatchDeleteFiles) {
        onBatchDeleteFiles(selectedFiles);
      } else if (user) {
        await batchSoftDeleteFiles(
          selectedFiles.map((f) => ({ id: f.id, name: f.name })),
          user.uid
        );
      } else {
        selectedFiles.forEach((f) => onDeleteFile(f));
      }
      setSelectedFileIds([]);
      setLastSelectedId(null);
      setShowBatchDeleteConfirm(false);
    } catch (err: any) {
      alert('Failed to delete selected files: ' + (err?.message || 'Unknown error'));
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Bulk Move
  const handleConfirmBulkMove = async () => {
    if (selectedFiles.length === 0) return;
    setBatchActionLoading(true);
    try {
      const targetFolder = folders.find((f) => f.id === batchTargetFolderId);
      const targetFolderName = targetFolder ? targetFolder.name : 'Root Storage';

      if (onBatchMoveFiles) {
        onBatchMoveFiles(selectedFiles, batchTargetFolderId);
      } else if (user) {
        await batchMoveFiles(
          selectedFiles.map((f) => f.id),
          batchTargetFolderId,
          user.uid,
          targetFolderName
        );
      } else {
        selectedFiles.forEach((f) => {
          onMoveFile({ ...f, parentFolderId: batchTargetFolderId });
        });
      }
      setSelectedFileIds([]);
      setLastSelectedId(null);
      setShowBatchMoveModal(false);
    } catch (err: any) {
      alert('Failed to move selected files: ' + (err?.message || 'Unknown error'));
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Bulk Vault Toggle
  const handleBulkToggleVault = async () => {
    if (selectedFiles.length === 0) return;
    // Determine whether to vault (if any is not in vault, put all in vault; else unvault)
    const anyNotInVault = selectedFiles.some((f) => !f.isVault);
    const targetVaultState = anyNotInVault;

    setBatchActionLoading(true);
    try {
      if (onBatchToggleVault) {
        onBatchToggleVault(selectedFiles, targetVaultState);
      } else if (user) {
        await batchToggleVault(
          selectedFiles.map((f) => ({ id: f.id, name: f.name })),
          targetVaultState,
          user.uid
        );
      } else {
        selectedFiles.forEach((f) => {
          onToggleVault(f.id, !!f.isVault, f.name);
        });
      }
      setSelectedFileIds([]);
      setLastSelectedId(null);
    } catch (err: any) {
      alert('Failed to update vault status: ' + (err?.message || 'Unknown error'));
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Bulk Star Toggle
  const handleBulkToggleStar = async () => {
    if (selectedFiles.length === 0) return;
    const anyUnstarred = selectedFiles.some((f) => !f.starred);
    setBatchActionLoading(true);
    try {
      await batchToggleStar(
        selectedFiles.map((f) => f.id),
        anyUnstarred
      );
      setSelectedFileIds([]);
      setLastSelectedId(null);
    } catch (err: any) {
      alert('Failed to update star status: ' + (err?.message || 'Unknown error'));
    } finally {
      setBatchActionLoading(false);
    }
  };

  const getIcon = (mimeType: string, filename: string) => {
    const cat = getFileCategory(mimeType, filename);
    if (cat === 'images') return <ImageIcon className="w-5 h-5 text-sky-400" />;
    if (cat === 'videos') return <Video className="w-5 h-5 text-indigo-400" />;
    if (cat === 'audio') return <Music className="w-5 h-5 text-amber-400" />;
    if (cat === 'documents') return <FileText className="w-5 h-5 text-emerald-400" />;
    if (cat === 'archives') return <Archive className="w-5 h-5 text-purple-400" />;
    return <HardDrive className="w-5 h-5 text-zinc-400" />;
  };

  return (
    <div className="space-y-5 relative">
      {/* Top Bar: Breadcrumbs & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Folder Breadcrumb" className="flex items-center gap-1.5 text-xs overflow-x-auto py-1">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id || 'root'}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
              <button
                onClick={() => {
                  setCurrentFolderId(crumb.id);
                  setSelectedCategory('all');
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition font-medium shrink-0 ${
                  idx === breadcrumbs.length - 1
                    ? 'text-white font-bold bg-zinc-900 border border-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                {crumb.id === null && <Home className="w-3.5 h-3.5" />}
                <span>{crumb.name}</span>
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Toolbar: New Folder & Upload */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCreateFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-semibold text-zinc-200 transition"
          >
            <FolderPlus className="w-4 h-4 text-sky-400" />
            <span>New Folder</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-md shadow-sky-950/40 transition active:scale-95"
          >
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Filter and View Mode Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {(
            [
              { id: 'all', label: 'All Files' },
              { id: 'images', label: 'Photos' },
              { id: 'videos', label: 'Videos' },
              { id: 'documents', label: 'Documents' },
              { id: 'audio', label: 'Audio' },
              { id: 'archives', label: 'Archives' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sorting, Selection & View Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Select All Toggle Button */}
          {activeFiles.length > 0 && (
            <button
              onClick={handleSelectAll}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition ${
                selectedFileIds.length > 0
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
              title={areAllSelected ? 'Deselect all visible files' : 'Select all visible files'}
            >
              {areAllSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
              ) : isPartiallySelected ? (
                <MinusSquare className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span>{areAllSelected ? 'Deselect All' : selectedFileIds.length > 0 ? `Selected (${selectedFileIds.length})` : 'Select All'}</span>
            </button>
          )}

          {/* Sort selector */}
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-0.5 text-xs">
            <select
              aria-label="Sort files by"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent text-zinc-300 text-xs py-1 px-2 outline-none cursor-pointer"
            >
              <option value="date" className="bg-zinc-900">Date Modified</option>
              <option value="name" className="bg-zinc-900">Name</option>
              <option value="size" className="bg-zinc-900">Size</option>
            </select>
            <button
              onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="p-1 text-zinc-400 hover:text-white"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grid vs List */}
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* FOLDERS SECTION */}
      {activeFolders.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Folders ({activeFolders.length})
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {activeFolders.map((folder) => (
              <div
                key={folder.id}
                onDoubleClick={() => setCurrentFolderId(folder.id)}
                onClick={() => setCurrentFolderId(folder.id)}
                className="group relative flex items-center justify-between p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-850/80 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Folder className="w-5 h-5 text-sky-400 shrink-0 fill-sky-400/20" />
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                    {folder.name}
                  </span>
                </div>

                <div
                  className="opacity-0 group-hover:opacity-100 transition relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setActiveMenuFolderId(activeMenuFolderId === folder.id ? null : folder.id)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {activeMenuFolderId === folder.id && (
                    <div className="absolute right-0 mt-1 w-36 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1 z-30 text-xs">
                      <button
                        onClick={() => {
                          setActiveMenuFolderId(null);
                          onRenameFolder(folder);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenuFolderId(null);
                          onDeleteFolder(folder);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-950/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILES SECTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Files ({activeFiles.length})
          </span>
          {activeFiles.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {selectedFileIds.length > 0
                  ? `${selectedFileIds.length} of ${activeFiles.length} selected (${formatBytes(totalSelectedSize)})`
                  : `${activeFiles.length} items`}
              </span>
              <button
                onClick={handleSelectAll}
                className="text-xs text-sky-400 hover:text-sky-300 transition font-medium"
              >
                {selectedFileIds.length === activeFiles.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}
        </div>

        {activeFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center">
            <HardDrive className="w-12 h-12 text-zinc-600 mb-3" />
            <h4 className="text-sm font-semibold text-zinc-300">This folder is empty</h4>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              Upload files to store them securely with verified integrity in INFCLOUD.
            </p>
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg transition active:scale-95"
            >
              Upload Files
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {activeFiles.map((file) => {
              const isSelected = selectedFileIds.includes(file.id);
              const isImage = getFileCategory(file.mimeType, file.name) === 'images';

              return (
                <div
                  key={file.id}
                  onClick={() => onPreviewFile(file)}
                  className={`group relative flex flex-col p-3 rounded-2xl border transition cursor-pointer select-none ${
                    isSelected
                      ? 'bg-sky-950/20 border-sky-500/80 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/40'
                      : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-850/80'
                  }`}
                >
                  {/* Select Checkbox & Action Icons Bar */}
                  <div className="flex items-center justify-between mb-2" onClick={(e) => e.stopPropagation()}>
                    {/* Checkbox button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(file.id, e.shiftKey);
                      }}
                      className={`p-1 -m-1 rounded-lg transition flex items-center justify-center ${
                        isSelected
                          ? 'text-sky-400'
                          : selectedFileIds.length > 0
                          ? 'text-zinc-500 hover:text-zinc-300'
                          : 'text-zinc-600 opacity-60 group-hover:opacity-100 hover:text-zinc-300'
                      }`}
                      title={isSelected ? 'Deselect file' : 'Select file (Shift+Click for range)'}
                    >
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-md bg-sky-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/50">
                          <CheckSquare className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-md border border-zinc-700 group-hover:border-zinc-500 bg-zinc-950/60 flex items-center justify-center hover:bg-zinc-900 transition">
                          <Square className="w-3.5 h-3.5 text-transparent hover:text-zinc-400" />
                        </div>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      {file.isVault && (
                        <span className="p-1 text-emerald-400" title="Secured in Private Vault">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}

                      <button
                        onClick={() => onToggleStar(file.id, file.starred)}
                        className={`p-1 rounded-lg transition ${
                          file.starred ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-300'
                        }`}
                        title={file.starred ? 'Starred' : 'Star file'}
                      >
                        <Star className={`w-3.5 h-3.5 ${file.starred ? 'fill-amber-400' : ''}`} />
                      </button>

                      {/* File More Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuFileId(activeMenuFileId === file.id ? null : file.id)}
                          className="p-1 rounded-lg text-zinc-500 hover:text-white"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuFileId === file.id && (
                          <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-30 text-xs">
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                onPreviewFile(file);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                downloadFileBlob(file.storageKey, file.downloadUrl, file.name);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                onShareFile(file);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share Link & QR</span>
                            </button>
                            {onCreatePackage && (
                              <button
                                onClick={() => {
                                  setActiveMenuFileId(null);
                                  onCreatePackage([file.id]);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sky-300 hover:text-white hover:bg-sky-950/40 transition"
                              >
                                <Package className="w-3.5 h-3.5 text-sky-400" />
                                <span>Create Package (Code)</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                handleOpenCompress([file]);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-950/40 transition"
                            >
                              <Archive className="w-3.5 h-3.5 text-purple-400" />
                              <span>Compress (ZIP)</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                onRenameFile(file);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                onMoveFile(file);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                              <span>Move to...</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                onToggleVault(file.id, !!file.isVault, file.name);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/40 transition"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>{file.isVault ? 'Remove from Vault' : 'Move to Vault'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                onDeleteFile(file);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-950/40 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Move to Trash</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail / Icon area */}
                  <div className="w-full h-24 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-center overflow-hidden mb-2">
                    {isImage && file.downloadUrl ? (
                      <img
                        src={file.downloadUrl}
                        alt={file.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="p-3">{getIcon(file.mimeType, file.name)}</div>
                    )}
                  </div>

                  {/* File Metadata */}
                  <div className="overflow-hidden">
                    <h5 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate" title={file.name}>
                      {file.name}
                    </h5>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-0.5">
                      <span>{formatBytes(file.size)}</span>
                      <span>{formatDate(file.updatedAt || file.createdAt).split(',')[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden divide-y divide-zinc-800/60">
            {/* Table Header Row */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-950/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider select-none border-b border-zinc-800/80">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="p-1 -m-1 rounded-lg text-zinc-500 hover:text-white transition"
                  title={areAllSelected ? 'Deselect All' : 'Select All'}
                >
                  {areAllSelected ? (
                    <div className="w-4 h-4 rounded bg-sky-500 flex items-center justify-center text-white">
                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : isPartiallySelected ? (
                    <div className="w-4 h-4 rounded bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-400">
                      <MinusSquare className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                      <Square className="w-3 h-3 text-transparent" />
                    </div>
                  )}
                </button>
                <span>File Name</span>
              </div>
              <div className="hidden sm:flex items-center gap-6 text-right shrink-0 mx-4">
                <span className="w-20">Size</span>
                <span className="w-32">Date Modified</span>
              </div>
              <div className="w-24 text-right pr-2">Actions</div>
            </div>

            {/* File Rows */}
            {activeFiles.map((file) => {
              const isSelected = selectedFileIds.includes(file.id);

              return (
                <div
                  key={file.id}
                  onClick={() => onPreviewFile(file)}
                  className={`flex items-center justify-between p-3.5 hover:bg-zinc-850/80 transition cursor-pointer select-none text-xs ${
                    isSelected ? 'bg-sky-950/20 border-l-2 border-l-sky-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    {/* Row Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(file.id, e.shiftKey);
                      }}
                      className={`p-1 -m-1 rounded-lg transition ${
                        isSelected ? 'text-sky-400' : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                      title={isSelected ? 'Deselect file' : 'Select file (Shift+Click for range)'}
                    >
                      {isSelected ? (
                        <div className="w-4 h-4 rounded bg-sky-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/50">
                          <CheckSquare className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-zinc-700 hover:border-zinc-500 bg-zinc-950/60 flex items-center justify-center hover:bg-zinc-900 transition">
                          <Square className="w-3 h-3 text-transparent hover:text-zinc-400" />
                        </div>
                      )}
                    </button>

                    <div className="shrink-0">{getIcon(file.mimeType, file.name)}</div>

                    <div className="truncate flex items-center gap-2">
                      <span className="font-semibold text-zinc-200 hover:text-white truncate block max-w-xs md:max-w-md">
                        {file.name}
                      </span>
                      {file.isVault && (
                        <span title="In Vault">
                          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-6 text-zinc-400 text-right shrink-0 mx-4">
                    <span className="w-20">{formatBytes(file.size)}</span>
                    <span className="w-32">{formatDate(file.updatedAt || file.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleStar(file.id, file.starred)}
                      className={`p-1.5 rounded-lg ${
                        file.starred ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title={file.starred ? 'Starred' : 'Star file'}
                    >
                      <Star className={`w-3.5 h-3.5 ${file.starred ? 'fill-amber-400' : ''}`} />
                    </button>
                    <button
                      onClick={() => downloadFileBlob(file.storageKey, file.downloadUrl, file.name)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onShareFile(file)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                      title="Share Link & QR"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    {onCreatePackage && (
                      <button
                        onClick={() => onCreatePackage([file.id])}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-sky-400"
                        title="Create Package (8-Char Code)"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenCompress([file])}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-400 transition"
                      title="Compress to ZIP"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteFile(file)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOATING BATCH ACTION BAR */}
      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 shadow-2xl shadow-black/80 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2 text-xs ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Selected Stats & Clear */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30 text-xs">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectedFileIds.length}</span>
            </span>
            <span className="text-zinc-400 text-xs hidden sm:inline">
              ({formatBytes(totalSelectedSize)})
            </span>
            <button
              onClick={handleClearSelection}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition rounded-lg"
              title="Deselect all (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
            {/* Move */}
            <button
              onClick={() => {
                setBatchTargetFolderId(currentFolderId);
                setShowBatchMoveModal(true);
              }}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white font-medium transition active:scale-95"
              title="Move selected files to a folder"
            >
              <FolderInput className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Move</span>
            </button>

            {/* Vault */}
            <button
              onClick={handleBulkToggleVault}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white font-medium transition active:scale-95"
              title="Toggle Private Vault for selected files"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Vault</span>
            </button>

            {/* Compress to ZIP */}
            <button
              onClick={() => handleOpenCompress(selectedFiles)}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-semibold transition active:scale-95"
              title="Compress selected files to ZIP (optimize storage / share)"
            >
              <Archive className="w-3.5 h-3.5 text-purple-400" />
              <span>Compress</span>
            </button>

            {/* Create Package */}
            {onCreatePackage && (
              <button
                onClick={() => onCreatePackage(selectedFileIds)}
                disabled={batchActionLoading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-semibold transition active:scale-95"
                title="Create 8-character code package from selected files"
              >
                <Package className="w-3.5 h-3.5 text-sky-400" />
                <span>Package</span>
              </button>
            )}

            {/* Star */}
            <button
              onClick={handleBulkToggleStar}
              disabled={batchActionLoading}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 font-medium transition active:scale-95"
              title="Star / Unstar selected files"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400/40" />
            </button>

            {/* Delete (Trash) */}
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              disabled={batchActionLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 font-medium transition active:scale-95"
              title="Move selected files to Recycle Bin"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* BATCH MOVE MODAL */}
      {showBatchMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Move {selectedFiles.length} {selectedFiles.length === 1 ? 'item' : 'items'}
                </h3>
              </div>
              <button
                onClick={() => setShowBatchMoveModal(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-3">
              Select destination folder for {selectedFiles.length} selected files ({formatBytes(totalSelectedSize)}):
            </p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 mb-5">
              {/* Root / Home Option */}
              <button
                type="button"
                onClick={() => setBatchTargetFolderId(null)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                  batchTargetFolderId === null
                    ? 'bg-zinc-800 border-sky-500 text-white'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Home className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Root Storage (Home)</span>
              </button>

              {/* Folders List */}
              {folders
                .filter((f) => !f.isTrashed && !f.isVault)
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBatchTargetFolderId(f.id)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                      batchTargetFolderId === f.id
                        ? 'bg-zinc-800 border-sky-500 text-white'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Folder className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBatchMoveModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkMove}
                disabled={batchActionLoading}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-2"
              >
                {batchActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Move Here</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DELETE CONFIRMATION MODAL */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
            <div className="flex items-center gap-3 mb-3 text-red-400">
              <div className="w-9 h-9 rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Move to Recycle Bin?</h3>
            </div>

            <p className="text-xs text-zinc-400 mb-2">
              Are you sure you want to move <span className="font-semibold text-white">{selectedFiles.length} files</span> ({formatBytes(totalSelectedSize)}) to the Recycle Bin?
            </p>
            <p className="text-[11px] text-zinc-500 mb-5">
              Files can be restored from the Recycle Bin at any time before being permanently purged.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={batchActionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-2"
              >
                {batchActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Move to Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPRESS TO ZIP MODAL */}
      <CompressModal
        isOpen={showCompressModal}
        files={compressTargetFiles}
        currentFolderId={currentFolderId}
        onClose={() => {
          setShowCompressModal(false);
          setCompressTargetFiles([]);
        }}
        onCompressedAndUploaded={(compressedFile, targetFolder) => {
          if (onUploadFiles) {
            onUploadFiles([compressedFile], targetFolder);
          }
        }}
      />
    </div>
  );
};
