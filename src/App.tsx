/**
 * INFCLOUD - Master Application Entry Point
 * Complete, functional cloud storage web application inspired by TeraBox & Google Drive.
 * Enhanced with Persistent Resumable Upload Queue ("Pause Now, Resume After 10 Days"),
 * Android Web Share Target support, Smart Memory preferences, and Netlify-compatible deep routing.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthProvider, useAuth, DEFAULT_QUOTA_BYTES } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { StorageCard } from './components/dashboard/StorageCard';
import { QuickShortcuts } from './components/dashboard/QuickShortcuts';
import { FileManager } from './components/files/FileManager';
import { MediaGallery } from './components/media/MediaGallery';
import { TransferCenter } from './components/transfers/TransferCenter';
import { UploadWidget } from './components/transfers/UploadWidget';
import { QuickDrop } from './components/sharing/QuickDrop';
import { ShareManager } from './components/sharing/ShareManager';
import { GuestShareView } from './components/sharing/GuestShareView';
import { PrivateVault } from './components/vault/PrivateVault';
import { StorageCleanup } from './components/cleanup/StorageCleanup';
import { DuplicateDetector } from './components/cleanup/DuplicateDetector';
import { PhoneBackup } from './components/backup/PhoneBackup';
import { RecycleBin } from './components/trash/RecycleBin';
import { SettingsView } from './components/settings/SettingsView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { FilePreviewModal } from './components/modals/FilePreviewModal';
import { ShareModal } from './components/modals/ShareModal';
import { FolderModal } from './components/modals/FolderModal';
import { RenameFileModal } from './components/modals/RenameFileModal';
import { MoveFileModal } from './components/modals/MoveFileModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { CreatePackageModal } from './components/packages/CreatePackageModal';
import { OpenPackageView } from './components/packages/OpenPackageView';
import { PackagesManager } from './components/packages/PackagesManager';
import { Logo } from './components/brand/Logo';
import {
  FileItem,
  FolderItem,
  ShareRecord,
  TransferItem,
  NavigationTab,
  FileCategory,
  ActivityLogItem,
  FilePackage,
  PackageItemFile,
} from './types';
import {
  subscribeUserFiles,
  subscribeUserFolders,
  subscribeUserShares,
  subscribeUserPackages,
  subscribeUserActivity,
  addFileRecord,
  renameFile,
  moveFile,
  softDeleteFile,
  restoreFile,
  permanentlyDeleteFile,
  toggleFileStar,
  toggleFileVault,
  batchSoftDeleteFiles,
  batchMoveFiles,
  batchToggleVault,
  createFolder,
  renameFolder,
  softDeleteFolder,
  restoreFolder,
  permanentlyDeleteFolder,
  updateUserPreferences,
} from './lib/database';
import { uploadFileWithFallback, storeSessionFile, getSessionFile, removeSessionFile } from './lib/storage';
import {
  saveTaskToQueue,
  updateTaskInQueue,
  loadAllQueueTasks,
  removeTaskFromQueue,
  clearCompletedFromQueue,
  getTaskBlob,
} from './lib/uploadQueue';
import { getFileCategory, formatBytes, formatDate } from './lib/utils';
import { Clock, HardDrive } from 'lucide-react';

function InfcloudMain() {
  const { user, profile, loading: authLoading, recalculateUsedBytes } = useAuth();

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Firestore Subscriptions State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [packages, setPackages] = useState<FilePackage[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  // Transfers & Upload State
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);
  const [uploadIsVault, setUploadIsVault] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const pendingResumeIdRef = useRef<string | null>(null);
  const activeCancelFns = useRef<Map<string, any>>(new Map());

  // Modals & Navigation
  const [previewFile, setPreviewFile] = useState<FileItem | PackageItemFile | null>(null);
  const [previewFileList, setPreviewFileList] = useState<(FileItem | PackageItemFile)[]>([]);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<FolderItem | null>(null);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [fileToMove, setFileToMove] = useState<FileItem | null>(null);
  const [createPackageModalOpen, setCreatePackageModalOpen] = useState(false);
  const [packagePreselectedFileIds, setPackagePreselectedFileIds] = useState<string[]>([]);
  const [openPackageCode, setOpenPackageCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('package') || params.get('pkg') || params.get('code');
    if (fromQuery && fromQuery.length === 8) return fromQuery.toLowerCase();
    const path = window.location.pathname;
    const match = path.match(/^\/(?:p|package)\/([a-zA-Z0-9]{8})/);
    return match ? match[1].toLowerCase() : '';
  });
  const [guestOpenPackage, setGuestOpenPackage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('package') || params.get('pkg') || params.get('code');
    return Boolean((fromQuery && fromQuery.length === 8) || window.location.pathname.startsWith('/p/'));
  });

  // Guest share token detection from URL (/s/<token>, /share/<token>, or ?share=<token>)
  const [guestShareToken, setGuestShareToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('share');
    if (fromQuery) return fromQuery;

    const path = window.location.pathname;
    const match = path.match(/^\/(?:s|share)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  });

  // Attach Firestore Listeners when authenticated
  useEffect(() => {
    if (!user) {
      setFiles([]);
      setFolders([]);
      setShares([]);
      setPackages([]);
      setActivityLogs([]);
      setTransfers([]);
      return;
    }

    const unsubFiles = subscribeUserFiles(user.uid, setFiles);
    const unsubFolders = subscribeUserFolders(user.uid, setFolders);
    const unsubShares = subscribeUserShares(user.uid, setShares);
    const unsubPackages = subscribeUserPackages(user.uid, setPackages);
    const unsubActivity = subscribeUserActivity(user.uid, setActivityLogs);

    // Load persistent upload queue tasks (Pause Now, Resume After 10 Days)
    loadAllQueueTasks(user.uid).then((storedTasks) => {
      if (storedTasks.length > 0) {
        setTransfers((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const toAdd = storedTasks.filter((t) => !existingIds.has(t.id));
          return [...prev, ...toAdd];
        });
      }
    });

    return () => {
      unsubFiles();
      unsubFolders();
      unsubShares();
      unsubPackages();
      unsubActivity();
    };
  }, [user]);

  // Handle Android Share Sheet & PWA Shortcuts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const tabParam = params.get('tab');

    if (tabParam) {
      setActiveTab(tabParam as NavigationTab);
    }

    if (action === 'upload') {
      triggerUploadDialog(false);
    } else if (action === 'share-target') {
      const title = params.get('title') || '';
      const text = params.get('text') || '';
      const url = params.get('url') || '';
      const content = [title, text, url].filter(Boolean).join('\n\n');

      if (content && user) {
        const blob = new Blob([content], { type: 'text/plain' });
        const sharedFile = new File([blob], `Android_Share_${Date.now()}.txt`, { type: 'text/plain' });
        handleUploadFiles([sharedFile], null, false);
      }
    }
  }, [user]);

  // Authoritative Storage Calculations
  const maxQuotaBytes = profile?.maxQuotaBytes || DEFAULT_QUOTA_BYTES;

  const storageBreakdown = useMemo(() => {
    let images = 0;
    let videos = 0;
    let documents = 0;
    let audio = 0;
    let archives = 0;
    let other = 0;
    let trash = 0;

    files.forEach((f) => {
      if (f.isTrashed) {
        trash += f.size;
      } else {
        const cat = getFileCategory(f.mimeType, f.name);
        if (cat === 'images') images += f.size;
        else if (cat === 'videos') videos += f.size;
        else if (cat === 'documents') documents += f.size;
        else if (cat === 'audio') audio += f.size;
        else if (cat === 'archives') archives += f.size;
        else other += f.size;
      }
    });

    const total = images + videos + documents + audio + archives + other + trash;
    return {
      images,
      videos,
      documents,
      audio,
      archives,
      other,
      trash,
      total,
    };
  }, [files]);

  // Synchronize usedBytes back to profile when files change
  useEffect(() => {
    if (user && storageBreakdown.total !== profile?.usedBytes) {
      recalculateUsedBytes(storageBreakdown.total);
    }
  }, [storageBreakdown.total, user, profile?.usedBytes, recalculateUsedBytes]);

  // Check if network is Wi-Fi (for Wi-Fi Only transfer policy)
  const isWifiConnection = (): boolean => {
    try {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn && conn.type) {
        return conn.type === 'wifi' || conn.type === 'ethernet';
      }
    } catch {
      // ignore
    }
    return true; // Default allow if undetectable
  };

  // Concurrency limit for active streaming uploads (prevents mobile browser freezing & data congestion)
  const MAX_CONCURRENT_UPLOADS = 2;

  const pumpQueue = () => {
    if (!user) return;
    setTransfers((currentTransfers) => {
      const activeCount = currentTransfers.filter(
        (t) => t.status === 'uploading' || (t.status as any) === 'retrying'
      ).length;
      if (activeCount >= MAX_CONCURRENT_UPLOADS) return currentTransfers;

      const nextPending = currentTransfers.find((t) => t.status === 'pending');
      if (!nextPending) return currentTransfers;

      const file = getSessionFile(nextPending.id) || nextPending.file;
      if (file) {
        setTimeout(() => {
          startSingleUpload(nextPending.id, file, nextPending.parentFolderId, !!nextPending.isVault, nextPending.storageKey);
        }, 0);
      }
      return currentTransfers;
    });
  };

  const startSingleUpload = (
    transferId: string,
    file: File,
    targetFolder: string | null = null,
    isVault = false,
    storageKey?: string
  ) => {
    if (!user) return;

    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: 'uploading', speed: 'Starting...' } : t))
    );
    updateTaskInQueue(transferId, { status: 'uploading', speed: 'Starting...' });

    const cancelFn = uploadFileWithFallback(
      user.uid,
      file,
      (progressPayload) => {
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === transferId
              ? {
                  ...t,
                  progress: progressPayload.progress,
                  bytesTransferred: progressPayload.bytesTransferred,
                  speed: progressPayload.speedFormatted,
                  tmbFormatted: progressPayload.tmbFormatted,
                  networkType: progressPayload.networkType,
                  etaFormatted: progressPayload.etaFormatted,
                  serverNode: 'INFCLOUD High-Speed Storage Node',
                }
              : t
          )
        );

        updateTaskInQueue(transferId, {
          progress: progressPayload.progress,
          bytesTransferred: progressPayload.bytesTransferred,
          speed: progressPayload.speedFormatted,
          tmbFormatted: progressPayload.tmbFormatted,
          networkType: progressPayload.networkType,
          etaFormatted: progressPayload.etaFormatted,
        });
      },
      async (result) => {
        activeCancelFns.current.delete(transferId);

        const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newFile: FileItem = {
          id: fileId,
          ownerId: user.uid,
          name: file.name,
          originalName: file.name,
          storageKey: result.storageKey,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          parentFolderId: targetFolder,
          starred: false,
          isTrashed: false,
          isVault,
          downloadUrl: result.downloadUrl,
          storageProvider: result.provider,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await addFileRecord(newFile);
          setTransfers((prev) =>
            prev.map((t) =>
              t.id === transferId
                ? { ...t, status: 'completed', progress: 100, completedAt: new Date().toISOString() }
                : t
            )
          );
          await updateTaskInQueue(transferId, {
            status: 'completed',
            progress: 100,
            completedAt: new Date().toISOString(),
          });

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('INFCLOUD Upload Complete', {
                body: `${file.name} (${formatBytes(file.size)}) stored securely.`,
                icon: '/icon.svg',
              });
            } catch {}
          }
        } catch (e: any) {
          setTransfers((prev) =>
            prev.map((t) => (t.id === transferId ? { ...t, status: 'error', error: e?.message || 'Save failed' } : t))
          );
          await updateTaskInQueue(transferId, { status: 'error', error: e?.message || 'Save failed' });
        } finally {
          pumpQueue();
        }
      },
      (error) => {
        activeCancelFns.current.delete(transferId);
        setTransfers((prev) =>
          prev.map((t) => (t.id === transferId ? { ...t, status: 'error', error: error.message } : t))
        );
        updateTaskInQueue(transferId, { status: 'error', error: error.message });
        pumpQueue();
      },
      {
        parentFolderId: targetFolder,
        isVault,
        onStatusChange: (newStatus, msg) => {
          setTransfers((prev) =>
            prev.map((t) =>
              t.id === transferId
                ? {
                    ...t,
                    status: newStatus as any,
                    speed: msg || (newStatus === 'retrying' ? 'Retrying connection...' : t.speed),
                  }
                : t
            )
          );
          updateTaskInQueue(transferId, {
            status: newStatus as any,
            speed: msg,
          });
        },
      }
    );

    activeCancelFns.current.set(transferId, cancelFn);
  };

  // Real Upload Handler with Persistent Queue & Wi-Fi Check
  const handleUploadFiles = (fileList: FileList | File[], targetFolder: string | null = null, isVault = false) => {
    if (!user) return;
    const incomingFiles = Array.from(fileList);

    const isWifiOnly = profile?.preferences?.wifiOnlyUpload ?? false;
    const onWifi = isWifiConnection();

    incomingFiles.forEach((file) => {
      // 1. Storage Quota check before initiating upload
      if (storageBreakdown.total + file.size > maxQuotaBytes) {
        alert(
          `Cannot upload "${file.name}" (${formatBytes(file.size)}): Storage quota of ${formatBytes(maxQuotaBytes)} would be exceeded. Please adjust your tier.`
        );
        return;
      }

      const transferId = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `users/${user.uid}/files/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${sanitizedName}`;

      // Stash file in active session cache for instantaneous pause/resume without reselecting
      storeSessionFile(transferId, file);

      // If user enabled Wi-Fi only and is on cellular, start in paused state
      const shouldPause = isWifiOnly && !onWifi;
      const initialStatus = shouldPause ? 'paused' : 'pending';
      const initialSpeed = shouldPause ? 'Paused (Waiting for Wi-Fi)' : 'Queued';

      const newTransfer: TransferItem = {
        id: transferId,
        file,
        name: file.name,
        size: file.size,
        storageKey,
        mimeType: file.type || 'application/octet-stream',
        progress: 0,
        bytesTransferred: 0,
        speed: initialSpeed,
        status: initialStatus,
        type: 'upload',
        parentFolderId: targetFolder,
        isVault,
        startedAt: new Date().toISOString(),
      };

      // Add to transfers UI state
      setTransfers((prev) => [newTransfer, ...prev]);

      // Save to IndexedDB persistent queue ("Pause Now, Resume After 10 Days")
      saveTaskToQueue(user.uid, newTransfer, file);
    });

    // Pump queue to begin concurrent uploads
    setTimeout(() => pumpQueue(), 0);
  };

  // Pause an active upload
  const handlePauseTransfer = async (id: string) => {
    const cancelFn = activeCancelFns.current.get(id);
    if (cancelFn) {
      if (typeof cancelFn.pause === 'function') {
        await cancelFn.pause();
      } else {
        cancelFn();
      }
      activeCancelFns.current.delete(id);
    }
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'paused', speed: 'Paused' } : t))
    );
    await updateTaskInQueue(id, { status: 'paused', speed: 'Paused' });
    pumpQueue();
  };

  // Resume a paused upload (from saved Blob or reselected file)
  const handleResumeTransfer = async (id: string, reselectedFile?: File) => {
    const item = transfers.find((t) => t.id === id);
    if (!item || !user) return;

    let fileToUpload: File | null = reselectedFile || getSessionFile(id) || item.file || null;

    if (!fileToUpload) {
      const blob = await getTaskBlob(id);
      if (blob) {
        fileToUpload = new File([blob], item.name, { type: item.mimeType });
      }
    }

    if (!fileToUpload) {
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, needsReselect: true } : t))
      );
      return;
    }

    storeSessionFile(id, fileToUpload);
    startSingleUpload(id, fileToUpload, item.parentFolderId, !!item.isVault, item.storageKey);
  };

  const handlePauseAll = () => {
    transfers
      .filter((t) => t.status === 'uploading' || (t.status as any) === 'retrying')
      .forEach((t) => handlePauseTransfer(t.id));
  };

  const handleResumeAll = () => {
    transfers.filter((t) => t.status === 'paused').forEach((t) => handleResumeTransfer(t.id));
  };

  const handleCancelTransfer = async (id: string) => {
    const cancelFn = activeCancelFns.current.get(id);
    if (cancelFn) {
      if (typeof cancelFn.cancel === 'function') {
        await cancelFn.cancel();
      } else {
        cancelFn();
      }
      activeCancelFns.current.delete(id);
    }
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    await removeTaskFromQueue(id);
    pumpQueue();
  };

  const handleClearFinishedTransfers = async () => {
    if (user) await clearCompletedFromQueue(user.uid);
    setTransfers((prev) =>
      prev.filter((t) => t.status === 'uploading' || t.status === 'paused' || t.status === 'pending')
    );
  };

  // Open Native / Android file picker
  const triggerUploadDialog = (isVault = false) => {
    setUploadIsVault(isVault);
    setUploadTargetFolderId(currentFolderId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Drag and Drop Upload Support on desktop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files, currentFolderId, false);
    }
  };

  // Empty Recycle Bin
  const handleEmptyRecycleBin = async () => {
    if (!user) return;
    const trashedFiles = files.filter((f) => f.isTrashed);
    const trashedFolders = folders.filter((f) => f.isTrashed);

    if (trashedFiles.length === 0 && trashedFolders.length === 0) return;

    if (
      confirm(
        `Permanently purge ${trashedFiles.length} file(s) and ${trashedFolders.length} folder(s)? Stored objects will be deleted immediately.`
      )
    ) {
      for (const f of trashedFiles) {
        await permanentlyDeleteFile(f);
      }
      for (const fld of trashedFolders) {
        await permanentlyDeleteFolder(fld.id, fld.name, user.uid);
      }
    }
  };

  // Badge counts
  const trashedCount = files.filter((f) => f.isTrashed).length + folders.filter((f) => f.isTrashed).length;
  const activeTransfersCount = transfers.filter((t) => t.status === 'uploading' || t.status === 'pending').length;

  // Guest view for public share links (/s/<token>)
  if (guestShareToken) {
    return (
      <GuestShareView
        shareToken={guestShareToken}
        onExit={() => {
          setGuestShareToken(null);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-400">
        <Logo size="lg" showText={true} />
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mt-6" />
        <p className="text-xs text-zinc-500 mt-3 font-mono">Initializing secure connection...</p>
      </div>
    );
  }

  if (!user) {
    if (guestOpenPackage) {
      return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-8 flex flex-col items-center justify-center">
          <OpenPackageView
            initialCode={openPackageCode}
            onBackToApp={() => {
              setOpenPackageCode('');
              setGuestOpenPackage(false);
            }}
            onPreviewFile={(item, list) => {
              setPreviewFile(item as any);
              setPreviewFileList(list);
            }}
          />
          {previewFile && (
            <FilePreviewModal
              file={previewFile}
              fileList={previewFileList}
              onClose={() => {
                setPreviewFile(null);
                setPreviewFileList([]);
              }}
              onSelectFile={(f) => setPreviewFile(f as any)}
            />
          )}
        </div>
      );
    }
    return <AuthModal onOpenPackageCode={() => setGuestOpenPackage(true)} />;
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`min-h-screen flex flex-col bg-[#09090b] text-zinc-100 ${
        isDarkTheme ? 'dark' : ''
      }`}
    >
      {/* Hidden File Picker Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files, uploadTargetFolderId, uploadIsVault);
          }
        }}
      />

      {/* Hidden Folder Picker Input */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '', directory: '' } as any)}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files, uploadTargetFolderId, uploadIsVault);
          }
        }}
      />

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenUpload={() => triggerUploadDialog(false)}
        isDarkTheme={isDarkTheme}
        setIsDarkTheme={setIsDarkTheme}
        totalUsedBytes={storageBreakdown.total}
        maxQuotaBytes={maxQuotaBytes}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          trashedCount={trashedCount}
          activeTransfersCount={activeTransfersCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 md:p-6 pb-24 md:pb-12 overflow-y-auto">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Storage Overview Card */}
              <StorageCard
                totalUsedBytes={storageBreakdown.total}
                maxQuotaBytes={maxQuotaBytes}
                breakdown={storageBreakdown}
                setActiveTab={setActiveTab}
                files={files}
                packagesCount={packages.length}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setActiveTab('files');
                }}
              />

              {/* Quick Action Shortcuts */}
              <QuickShortcuts
                setActiveTab={setActiveTab}
                setSelectedCategory={setSelectedCategory}
                filesCount={files.filter((f) => !f.isTrashed && !f.isVault).length}
                starredCount={files.filter((f) => f.starred && !f.isTrashed).length}
                sharedCount={shares.filter((s) => !s.isRevoked).length}
                vaultCount={files.filter((f) => f.isVault && !f.isTrashed).length}
              />

              {/* Recent Files Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span>Recent Files</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('files')}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                  >
                    View all →
                  </button>
                </div>

                {files.filter((f) => !f.isTrashed && !f.isVault).length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center text-xs text-zinc-500">
                    No files uploaded yet. Drag and drop any file here to begin storing.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60 overflow-hidden">
                    {files
                      .filter((f) => !f.isTrashed && !f.isVault)
                      .slice(0, 5)
                      .map((file) => (
                        <div
                          key={file.id}
                          onClick={() => {
                            setPreviewFile(file);
                            setPreviewFileList(files.filter((f) => !f.isTrashed && !f.isVault));
                          }}
                          className="flex items-center justify-between p-3.5 text-xs hover:bg-zinc-850/60 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <HardDrive className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="font-semibold text-zinc-200 truncate max-w-xs md:max-w-md">
                              {file.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-zinc-400 shrink-0">
                            <span>{formatBytes(file.size)}</span>
                            <span>{formatDate(file.updatedAt || file.createdAt).split(',')[0]}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALL FILES TAB */}
          {activeTab === 'files' && (
            <FileManager
              files={files}
              folders={folders}
              currentFolderId={currentFolderId}
              setCurrentFolderId={setCurrentFolderId}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              searchQuery={searchQuery}
              onPreviewFile={(f) => {
                setPreviewFile(f);
                setPreviewFileList(files.filter((fl) => !fl.isTrashed && !fl.isVault));
              }}
              onShareFile={(f) => setShareFile(f)}
              onToggleStar={(id, curr) => toggleFileStar(id, curr)}
              onToggleVault={(id, curr, name) => toggleFileVault(id, curr, name, user.uid)}
              onDeleteFile={(f) => softDeleteFile(f.id, f.name, user.uid)}
              onRenameFile={(f) => setFileToRename(f)}
              onMoveFile={(f) => setFileToMove(f)}
              onCreateFolder={() => {
                setFolderToRename(null);
                setFolderModalOpen(true);
              }}
              onRenameFolder={(fld) => {
                setFolderToRename(fld);
                setFolderModalOpen(true);
              }}
              onDeleteFolder={(fld) => softDeleteFolder(fld.id, fld.name, user.uid)}
              onOpenUpload={() => triggerUploadDialog(false)}
              onBatchDeleteFiles={(selected) =>
                user && batchSoftDeleteFiles(selected.map((f) => ({ id: f.id, name: f.name })), user.uid)
              }
              onBatchMoveFiles={(selected, targetId) => {
                if (!user) return;
                const targetFolder = folders.find((f) => f.id === targetId);
                batchMoveFiles(
                  selected.map((f) => f.id),
                  targetId,
                  user.uid,
                  targetFolder ? targetFolder.name : 'Root'
                );
              }}
              onBatchToggleVault={(selected, isVault) =>
                user && batchToggleVault(selected.map((f) => ({ id: f.id, name: f.name })), isVault, user.uid)
              }
              onUploadFiles={(fl: File[], folderId?: string | null) =>
                handleUploadFiles(fl, folderId !== undefined ? folderId : currentFolderId, false)
              }
              onCreatePackage={(selectedIds) => {
                setPackagePreselectedFileIds(selectedIds);
                setCreatePackageModalOpen(true);
              }}
            />
          )}

          {/* PHOTOS & VIDEOS GALLERY */}
          {activeTab === 'photos' && (
            <MediaGallery
              files={files}
              onPreviewFile={(f) => setPreviewFile(f)}
              onShareFile={(f) => setShareFile(f)}
              onOpenUpload={() => triggerUploadDialog(false)}
            />
          )}

          {/* TRANSFER CENTER (Persistent Queue & Pause Now Resume After 10 Days) */}
          {activeTab === 'transfers' && (
            <TransferCenter
              transfers={transfers}
              onCancelTransfer={handleCancelTransfer}
              onClearHistory={handleClearFinishedTransfers}
              onPauseTransfer={handlePauseTransfer}
              onResumeTransfer={handleResumeTransfer}
              onPauseAll={handlePauseAll}
              onResumeAll={handleResumeAll}
              wifiOnly={profile?.preferences?.wifiOnlyUpload}
              onToggleWifiOnly={async () => {
                if (user) {
                  await updateUserPreferences(user.uid, {
                    wifiOnlyUpload: !profile?.preferences?.wifiOnlyUpload,
                  });
                }
              }}
              onRetryTransfer={(item) => {
                if (item.file) {
                  handleUploadFiles([item.file], item.parentFolderId, item.isVault);
                } else {
                  handleResumeTransfer(item.id);
                }
              }}
            />
          )}

          {/* QUICKDROP */}
          {activeTab === 'quickdrop' && (
            <QuickDrop
              onStartUpload={(fileList) => handleUploadFiles(fileList, null, false)}
            />
          )}

          {/* FILE PACKAGES MANAGER */}
          {activeTab === 'packages' && (
            <PackagesManager
              packages={packages}
              userId={user.uid}
              onCreatePackage={() => {
                setPackagePreselectedFileIds([]);
                setCreatePackageModalOpen(true);
              }}
              onOpenAccessCodeView={(code) => {
                setOpenPackageCode(code || '');
                setActiveTab('open-package');
              }}
              onPreviewFile={(item, list) => {
                setPreviewFile(item as any);
                setPreviewFileList(list);
              }}
            />
          )}

          {/* OPEN PACKAGE WITH ACCESS CODE */}
          {activeTab === 'open-package' && (
            <OpenPackageView
              initialCode={openPackageCode}
              onPreviewFile={(item, list) => {
                setPreviewFile(item as any);
                setPreviewFileList(list);
              }}
              onBackToApp={() => {
                setOpenPackageCode('');
                setActiveTab('packages');
              }}
            />
          )}

          {/* SHARED LINKS MANAGER */}
          {activeTab === 'shares' && <ShareManager shares={shares} />}

          {/* PRIVATE VAULT */}
          {activeTab === 'vault' && (
            <PrivateVault
              files={files}
              onPreviewFile={(f) => setPreviewFile(f)}
              onRemoveFromVault={(f) => toggleFileVault(f.id, true, f.name, user.uid)}
              onOpenUpload={(isVault) => triggerUploadDialog(isVault)}
            />
          )}

          {/* STORAGE CLEANUP */}
          {activeTab === 'cleanup' && (
            <StorageCleanup
              files={files}
              trashedBytes={storageBreakdown.trash}
              onDeleteFile={(f) => softDeleteFile(f.id, f.name, user.uid)}
              onEmptyTrash={handleEmptyRecycleBin}
              setActiveTab={setActiveTab}
            />
          )}

          {/* DUPLICATE DETECTOR */}
          {activeTab === 'duplicates' && (
            <DuplicateDetector
              files={files}
              onDeleteFile={(f) => softDeleteFile(f.id, f.name, user.uid)}
            />
          )}

          {/* PHONE BACKUP */}
          {activeTab === 'backup' && (
            <PhoneBackup
              totalUsedBytes={storageBreakdown.total}
              maxQuotaBytes={maxQuotaBytes}
              onStartUpload={(fList) => handleUploadFiles(fList, null, false)}
            />
          )}

          {/* RECYCLE BIN */}
          {activeTab === 'trash' && (
            <RecycleBin
              files={files}
              folders={folders}
              trashedBytes={storageBreakdown.trash}
              onRestoreFile={(f) => restoreFile(f.id, f.name, user.uid)}
              onPermanentlyDeleteFile={(f) => permanentlyDeleteFile(f)}
              onRestoreFolder={(fld) => restoreFolder(fld.id, fld.name, user.uid)}
              onPermanentlyDeleteFolder={(fld) => permanentlyDeleteFolder(fld.id, fld.name, user.uid)}
              onEmptyTrash={handleEmptyRecycleBin}
            />
          )}

          {/* SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <SettingsView
              isDarkTheme={isDarkTheme}
              setIsDarkTheme={setIsDarkTheme}
              totalUsedBytes={storageBreakdown.total}
              onClearRecentSearches={() => setSearchQuery('')}
            />
          )}

          {/* ADMIN CONSOLE */}
          {activeTab === 'admin' && profile?.role === 'admin' && (
            <AdminDashboard
              files={files}
              profile={profile}
              activityLogs={activityLogs}
            />
          )}
        </main>
      </div>

      {/* Floating Upload Queue Widget */}
      <UploadWidget
        transfers={transfers}
        onCancelTransfer={handleCancelTransfer}
        onClearCompleted={handleClearFinishedTransfers}
        onPauseTransfer={handlePauseTransfer}
        onResumeTransfer={(id, file) => handleResumeTransfer(id, file)}
        onResumeAll={handleResumeAll}
      />

      {/* Android Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        trashedCount={trashedCount}
        activeTransfersCount={activeTransfersCount}
      />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Universal File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          fileList={previewFileList.length > 0 ? previewFileList : files.filter((f) => !f.isTrashed && !f.isVault)}
          onClose={() => {
            setPreviewFile(null);
            setPreviewFileList([]);
          }}
          onSelectFile={(f) => setPreviewFile(f as any)}
          onShare={(f) => {
            setPreviewFile(null);
            setShareFile(f);
          }}
        />
      )}

      {/* Create Package Modal */}
      {createPackageModalOpen && (
        <CreatePackageModal
          files={files}
          folders={folders}
          preselectedFileIds={packagePreselectedFileIds}
          userId={user.uid}
          userDisplayName={profile?.displayName}
          userEmail={user.email || undefined}
          onClose={() => {
            setCreatePackageModalOpen(false);
            setPackagePreselectedFileIds([]);
          }}
          onPackageCreated={() => {
            setActiveTab('packages');
          }}
          onTestCode={(code) => {
            setOpenPackageCode(code);
            setActiveTab('open-package');
          }}
        />
      )}

      {/* Secure Share Modal */}
      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
        />
      )}

      {/* Create / Rename Folder Modal */}
      {folderModalOpen && (
        <FolderModal
          folderToRename={folderToRename}
          onClose={() => {
            setFolderModalOpen(false);
            setFolderToRename(null);
          }}
          onSubmit={async (name: string, color?: string) => {
            if (!user) return;
            if (folderToRename) {
              await renameFolder(folderToRename.id, name, user.uid);
            } else {
              const newFolder: FolderItem = {
                id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                ownerId: user.uid,
                name,
                parentFolderId: currentFolderId,
                color: color || '#38bdf8',
                isTrashed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              await createFolder(newFolder);
            }
            setFolderModalOpen(false);
            setFolderToRename(null);
          }}
        />
      )}

      {/* Rename File Modal */}
      {fileToRename && (
        <RenameFileModal
          file={fileToRename}
          onClose={() => setFileToRename(null)}
          onSubmit={async (newName: string) => {
            if (!user) return;
            await renameFile(fileToRename.id, newName, user.uid);
            setFileToRename(null);
          }}
        />
      )}

      {/* Move File Modal */}
      {fileToMove && (
        <MoveFileModal
          file={fileToMove}
          folders={folders}
          onClose={() => setFileToMove(null)}
          onSubmit={async (targetFolderId: string | null) => {
            if (!user) return;
            await moveFile(fileToMove.id, targetFolderId, fileToMove.name, user.uid);
            setFileToMove(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InfcloudMain />
    </AuthProvider>
  );
}
