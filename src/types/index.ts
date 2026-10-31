/**
 * INFCLOUD - Core Type Definitions & Data Models
 */

export interface UserPreferences {
  defaultView?: ViewMode;
  sortBy?: SortField;
  sortDirection?: SortDirection;
  wifiOnlyUpload?: boolean;
  maxConcurrency?: number;
  recentSearches?: string[];
  theme?: 'dark' | 'light';
  notificationsEnabled?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  maxQuotaBytes: number; // Default 988 GB (988 * 1e9 bytes)
  usedBytes: number;
  role: 'user' | 'admin';
  vaultPinHash?: string; // Optional Vault Security PIN
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  ownerId: string;
  name: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number; // in bytes
  parentFolderId: string | null;
  starred: boolean;
  isTrashed: boolean;
  trashedAt?: string | null;
  isVault?: boolean; // Secure isolated Private Vault
  isOffline?: boolean; // Offline cache status
  checksum?: string; // Fast fingerprint for duplicate detection
  downloadUrl?: string;
  storageProvider: 'server' | 'firebase' | 'indexeddb-fallback';
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
}

export interface FolderItem {
  id: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  color?: string;
  isTrashed: boolean;
  trashedAt?: string | null;
  isVault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShareRecord {
  id: string;
  fileId: string;
  fileIds?: string[]; // Multiple files bundle support (QuickDrop)
  ownerId: string;
  ownerEmail?: string;
  shareToken: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  downloadUrl?: string;
  expiresAt: string | null; // ISO string or null for never
  isPasswordProtected: boolean;
  passwordHash?: string;
  accessCount: number;
  isRevoked?: boolean;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  action: 'upload' | 'delete' | 'restore' | 'rename' | 'share' | 'move' | 'purge' | 'vault';
  targetName: string;
  targetType: 'file' | 'folder';
  timestamp: string;
  details?: string;
}

export interface TransferItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  mimeType: string;
  progress: number; // 0 - 100
  bytesTransferred: number;
  speed: string;
  tmbFormatted?: string; // Transferred MB e.g. "3.42 MB / 5.00 MB"
  networkType?: string; // e.g. "Wi-Fi" or "High-Speed Network"
  etaFormatted?: string; // e.g. "ETA: 2s"
  serverNode?: string; // e.g. "INFCLOUD Dedicated Server Node"
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'canceled';
  type: 'upload' | 'download';
  error?: string;
  parentFolderId: string | null;
  isVault?: boolean;
  startedAt: string;
  completedAt?: string;
  lastSavedAt?: string;
  storageKey?: string;
  needsReselect?: boolean;
  cancelFn?: () => void;
  pauseFn?: () => void;
  resumeFn?: () => void;
  retryFn?: () => void;
}

export interface PackageItemFile {
  fileId?: string;
  name: string;
  originalName: string;
  path: string; // Preserves relative folder structure e.g. "reports/q3/summary.pdf"
  size: number;
  mimeType: string;
  storageKey: string;
  downloadUrl?: string;
  storageProvider?: 'server' | 'firebase' | 'indexeddb-fallback';
}

export interface FilePackage {
  id: string; // pkg_${timestamp}_${random}
  ownerId: string;
  ownerDisplayName?: string;
  ownerEmail?: string;
  name: string;
  description?: string;
  accessCode: string; // Exactly 8 characters: 5 lowercase letters and 3 digits (e.g. "o7w7la0b")
  items: PackageItemFile[];
  totalFiles: number;
  totalSize: number;
  isRevoked: boolean;
  expiresAt: string | null;
  accessCount: number;
  lastAccessedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'grid' | 'list';

export type FileCategory = 'all' | 'images' | 'videos' | 'documents' | 'audio' | 'archives' | 'other';

export type SortField = 'name' | 'date' | 'size';
export type SortDirection = 'asc' | 'desc';

export type NavigationTab =
  | 'dashboard'
  | 'files'
  | 'photos'
  | 'videos'
  | 'vault'
  | 'packages'
  | 'open-package'
  | 'quickdrop'
  | 'shares'
  | 'transfers'
  | 'cleanup'
  | 'duplicates'
  | 'backup'
  | 'trash'
  | 'admin'
  | 'settings';
