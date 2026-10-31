import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { FileItem, FolderItem, ShareRecord, ActivityLogItem, UserPreferences, FilePackage, PackageItemFile } from '../types';
import { removeFileFromStorage } from './storage';

/**
 * FILES CRUD & OPERATIONS
 */

export function subscribeUserFiles(
  userId: string,
  onFiles: (files: FileItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'files'), where('ownerId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const files: FileItem[] = [];
      snapshot.forEach((docSnap) => {
        files.push(docSnap.data() as FileItem);
      });
      onFiles(files);
    },
    (error) => {
      console.error('Subscribe files error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'files');
    }
  );
}

export async function addFileRecord(file: FileItem): Promise<void> {
  try {
    const fileRef = doc(db, 'files', file.id);
    await setDoc(fileRef, cleanFirestoreData(file));
    await logActivity(file.ownerId, 'upload', file.name, 'file', `${(file.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `files/${file.id}`);
  }
}

export async function updateFileRecord(fileId: string, updates: Partial<FileItem>): Promise<void> {
  try {
    const fileRef = doc(db, 'files', fileId);
    await updateDoc(fileRef, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
  }
}

export async function renameFile(fileId: string, newName: string, userId: string): Promise<void> {
  try {
    const fileRef = doc(db, 'files', fileId);
    await updateDoc(fileRef, {
      name: newName,
      updatedAt: new Date().toISOString(),
    });
    await logActivity(userId, 'rename', newName, 'file');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
  }
}

export async function moveFile(fileId: string, targetFolderId: string | null, fileName: string, userId: string): Promise<void> {
  try {
    const fileRef = doc(db, 'files', fileId);
    await updateDoc(fileRef, {
      parentFolderId: targetFolderId,
      updatedAt: new Date().toISOString(),
    });
    await logActivity(userId, 'move', fileName, 'file', targetFolderId ? 'Moved to folder' : 'Moved to root');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
  }
}

export async function softDeleteFile(fileId: string, fileName: string, userId: string): Promise<void> {
  try {
    const fileRef = doc(db, 'files', fileId);
    await updateDoc(fileRef, {
      isTrashed: true,
      trashedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await logActivity(userId, 'delete', fileName, 'file', 'Moved to Recycle Bin');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
  }
}

export async function restoreFile(fileId: string, fileName: string, userId: string): Promise<void> {
  try {
    const fileRef = doc(db, 'files', fileId);
    await updateDoc(fileRef, {
      isTrashed: false,
      trashedAt: null,
      updatedAt: new Date().toISOString(),
    });
    await logActivity(userId, 'restore', fileName, 'file', 'Restored from Recycle Bin');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
  }
}

export async function permanentlyDeleteFile(file: FileItem): Promise<void> {
  try {
    // 1. Remove physical bytes from storage engine
    await removeFileFromStorage(file.storageKey, file.storageProvider);

    // 2. Remove metadata document from Firestore
    const fileRef = doc(db, 'files', file.id);
    await deleteDoc(fileRef);

    await logActivity(file.ownerId, 'purge', file.name, 'file', 'Permanently removed bytes');
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `files/${file.id}`);
  }
}

export async function toggleFileStar(fileId: string, currentStarred: boolean): Promise<void> {
  try {
    const fileRef = doc(db, 'files', fileId);
    await updateDoc(fileRef, {
      starred: !currentStarred,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
  }
}

export async function toggleFileVault(fileId: string, currentVault: boolean, fileName: string, userId: string): Promise<void> {
  try {
    const fileRef = doc(db, 'files', fileId);
    await updateDoc(fileRef, {
      isVault: !currentVault,
      updatedAt: new Date().toISOString(),
    });
    await logActivity(userId, 'vault', fileName, 'file', !currentVault ? 'Secured in Private Vault' : 'Removed from Vault');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `files/${fileId}`);
  }
}

export async function batchSoftDeleteFiles(files: { id: string; name: string }[], userId: string): Promise<void> {
  if (files.length === 0) return;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    files.forEach((f) => {
      const fileRef = doc(db, 'files', f.id);
      batch.update(fileRef, {
        isTrashed: true,
        trashedAt: now,
        updatedAt: now,
      });
    });
    await batch.commit();
    await logActivity(
      userId,
      'delete',
      `${files.length} items`,
      'file',
      `Moved ${files.length} files to Recycle Bin`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'files/batch-trash');
  }
}

export async function batchMoveFiles(
  fileIds: string[],
  targetFolderId: string | null,
  userId: string,
  folderName: string = 'destination'
): Promise<void> {
  if (fileIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    fileIds.forEach((id) => {
      const fileRef = doc(db, 'files', id);
      batch.update(fileRef, {
        parentFolderId: targetFolderId,
        updatedAt: now,
      });
    });
    await batch.commit();
    await logActivity(
      userId,
      'move',
      `${fileIds.length} items`,
      'file',
      targetFolderId ? `Moved ${fileIds.length} files to ${folderName}` : `Moved ${fileIds.length} files to root`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'files/batch-move');
  }
}

export async function batchToggleVault(
  files: { id: string; name: string }[],
  isVault: boolean,
  userId: string
): Promise<void> {
  if (files.length === 0) return;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    files.forEach((f) => {
      const fileRef = doc(db, 'files', f.id);
      batch.update(fileRef, {
        isVault,
        updatedAt: now,
      });
    });
    await batch.commit();
    await logActivity(
      userId,
      'vault',
      `${files.length} items`,
      'file',
      isVault ? `Secured ${files.length} files in Private Vault` : `Removed ${files.length} files from Vault`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'files/batch-vault');
  }
}

export async function batchToggleStar(fileIds: string[], starred: boolean): Promise<void> {
  if (fileIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    fileIds.forEach((id) => {
      const fileRef = doc(db, 'files', id);
      batch.update(fileRef, {
        starred,
        updatedAt: now,
      });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'files/batch-star');
  }
}

/**
 * FOLDERS CRUD & OPERATIONS
 */

export function subscribeUserFolders(
  userId: string,
  onFolders: (folders: FolderItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'folders'), where('ownerId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const folders: FolderItem[] = [];
      snapshot.forEach((docSnap) => {
        folders.push(docSnap.data() as FolderItem);
      });
      onFolders(folders);
    },
    (error) => {
      console.error('Subscribe folders error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'folders');
    }
  );
}

export async function createFolder(folder: FolderItem): Promise<void> {
  try {
    const folderRef = doc(db, 'folders', folder.id);
    await setDoc(folderRef, cleanFirestoreData(folder));
    await logActivity(folder.ownerId, 'upload', folder.name, 'folder', 'Created folder');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `folders/${folder.id}`);
  }
}

export async function renameFolder(folderId: string, newName: string, userId: string): Promise<void> {
  try {
    const folderRef = doc(db, 'folders', folderId);
    await updateDoc(folderRef, {
      name: newName,
      updatedAt: new Date().toISOString(),
    });
    await logActivity(userId, 'rename', newName, 'folder');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `folders/${folderId}`);
  }
}

export async function softDeleteFolder(folderId: string, folderName: string, userId: string): Promise<void> {
  try {
    const folderRef = doc(db, 'folders', folderId);
    await updateDoc(folderRef, {
      isTrashed: true,
      trashedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await logActivity(userId, 'delete', folderName, 'folder', 'Moved folder to Recycle Bin');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `folders/${folderId}`);
  }
}

export async function restoreFolder(folderId: string, folderName: string, userId: string): Promise<void> {
  try {
    const folderRef = doc(db, 'folders', folderId);
    await updateDoc(folderRef, {
      isTrashed: false,
      trashedAt: null,
      updatedAt: new Date().toISOString(),
    });
    await logActivity(userId, 'restore', folderName, 'folder', 'Restored folder');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `folders/${folderId}`);
  }
}

export async function permanentlyDeleteFolder(folderId: string, folderName: string, userId: string): Promise<void> {
  try {
    const folderRef = doc(db, 'folders', folderId);
    await deleteDoc(folderRef);
    await logActivity(userId, 'purge', folderName, 'folder', 'Permanently deleted folder');
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `folders/${folderId}`);
  }
}

/**
 * SHARES CRUD & OPERATIONS
 */

export function subscribeUserShares(
  userId: string,
  onShares: (shares: ShareRecord[]) => void
): () => void {
  const q = query(collection(db, 'shares'), where('ownerId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const shares: ShareRecord[] = [];
      snapshot.forEach((d) => shares.push(d.data() as ShareRecord));
      onShares(shares);
    },
    (err) => {
      console.warn('Shares subscribe notice:', err);
    }
  );
}

export async function createShareRecord(share: ShareRecord): Promise<void> {
  try {
    const shareRef = doc(db, 'shares', share.id);
    await setDoc(shareRef, cleanFirestoreData(share));

    // Also mark file as shared
    if (share.fileId) {
      const fileRef = doc(db, 'files', share.fileId);
      await updateDoc(fileRef, { isShared: true }).catch(() => {});
    }

    await logActivity(share.ownerId, 'share', share.fileName, 'file', 'Generated public share link');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `shares/${share.id}`);
  }
}

export async function revokeShareRecord(shareId: string, fileName: string, userId: string): Promise<void> {
  try {
    const shareRef = doc(db, 'shares', shareId);
    await updateDoc(shareRef, {
      isRevoked: true,
    });
    await logActivity(userId, 'share', fileName, 'file', 'Revoked share link');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `shares/${shareId}`);
  }
}

export async function getShareByToken(token: string): Promise<ShareRecord | null> {
  try {
    const q = query(collection(db, 'shares'), where('shareToken', '==', token), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as ShareRecord;
    }
    return null;
  } catch (err) {
    console.warn('Get share by token notice:', err);
    return null;
  }
}

export async function incrementShareAccess(shareId: string): Promise<void> {
  try {
    const shareRef = doc(db, 'shares', shareId);
    await updateDoc(shareRef, {
      accessCount: increment(1),
    });
  } catch (err) {
    // Non-blocking
  }
}

/**
 * PACKAGES CRUD & 8-CHARACTER CODE SHARING
 */

export function generate8CharPackageCode(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  
  // Pick exactly 5 lowercase letters
  const chosenLetters: string[] = [];
  for (let i = 0; i < 5; i++) {
    chosenLetters.push(letters.charAt(Math.floor(Math.random() * letters.length)));
  }
  
  // Pick exactly 3 digits
  const chosenDigits: string[] = [];
  for (let i = 0; i < 3; i++) {
    chosenDigits.push(digits.charAt(Math.floor(Math.random() * digits.length)));
  }
  
  // Combine and shuffle uniformly
  const combined = [...chosenLetters, ...chosenDigits];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  
  return combined.join('');
}

export function validatePackageCodeFormat(code: string): boolean {
  if (!code || code.trim().length !== 8) return false;
  const lower = code.trim().toLowerCase();
  const letterCount = (lower.match(/[a-z]/g) || []).length;
  const digitCount = (lower.match(/[0-9]/g) || []).length;
  return letterCount === 5 && digitCount === 3;
}

export function subscribeUserPackages(
  userId: string,
  onPackages: (packages: FilePackage[]) => void
): () => void {
  const q = query(collection(db, 'packages'), where('ownerId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const packages: FilePackage[] = [];
      snapshot.forEach((d) => packages.push(d.data() as FilePackage));
      packages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onPackages(packages);
    },
    (err) => {
      console.warn('Packages subscribe notice:', err);
    }
  );
}

export async function createPackageRecord(
  pkgData: Omit<FilePackage, 'id' | 'accessCode' | 'isRevoked' | 'accessCount' | 'createdAt' | 'updatedAt'>
): Promise<FilePackage> {
  try {
    const packageId = `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Ensure code uniqueness in Firestore before assigning
    let accessCode = generate8CharPackageCode();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 5) {
      attempts++;
      const checkQ = query(collection(db, 'packages'), where('accessCode', '==', accessCode), limit(1));
      const existingSnap = await getDocs(checkQ);
      if (existingSnap.empty) {
        isUnique = true;
      } else {
        accessCode = generate8CharPackageCode();
      }
    }

    const now = new Date().toISOString();
    const newPackage: FilePackage = {
      ...pkgData,
      id: packageId,
      accessCode,
      isRevoked: false,
      accessCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const pkgRef = doc(db, 'packages', packageId);
    await setDoc(pkgRef, cleanFirestoreData(newPackage));

    await logActivity(
      pkgData.ownerId,
      'share',
      pkgData.name,
      'file',
      `Created package with ${pkgData.items.length} files (Code: ${accessCode})`
    );

    return newPackage;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'packages');
  }
}

export async function getPackageByAccessCode(rawCode: string): Promise<FilePackage> {
  const code = rawCode.trim().toLowerCase();
  if (!code) {
    throw new Error('Please enter an 8-character access code.');
  }

  try {
    const q = query(
      collection(db, 'packages'),
      where('accessCode', '==', code),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error(`Package with code "${code}" was not found. Please verify the 8-character code and try again.`);
    }

    const pkg = snapshot.docs[0].data() as FilePackage;

    if (pkg.isRevoked) {
      throw new Error(`This package has been revoked by the owner and is no longer accessible.`);
    }

    if (pkg.expiresAt && new Date(pkg.expiresAt).getTime() < Date.now()) {
      throw new Error(`This package access code expired on ${new Date(pkg.expiresAt).toLocaleDateString()}.`);
    }

    // Increment access count atomically in background
    try {
      const pkgRef = doc(db, 'packages', pkg.id);
      await updateDoc(pkgRef, {
        accessCount: increment(1),
        lastAccessedAt: new Date().toISOString(),
      });
    } catch {
      // Non-blocking
    }

    return pkg;
  } catch (err: any) {
    if (err.message && (err.message.includes('not found') || err.message.includes('revoked') || err.message.includes('expired'))) {
      throw err;
    }
    console.warn('Get package by code error:', err);
    throw new Error('Unable to access package. Please check network connection and try again.');
  }
}

export async function togglePackageRevocation(
  packageId: string,
  currentRevoked: boolean,
  userId: string
): Promise<void> {
  try {
    const pkgRef = doc(db, 'packages', packageId);
    await updateDoc(pkgRef, {
      isRevoked: !currentRevoked,
      updatedAt: new Date().toISOString(),
    });
    await logActivity(
      userId,
      'share',
      packageId,
      'file',
      !currentRevoked ? 'Revoked package access code' : 'Restored package access code'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `packages/${packageId}`);
  }
}

export async function deletePackageRecord(packageId: string, userId: string): Promise<void> {
  try {
    const pkgRef = doc(db, 'packages', packageId);
    await deleteDoc(pkgRef);
    await logActivity(userId, 'delete', packageId, 'file', 'Deleted package');
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `packages/${packageId}`);
  }
}

/**
 * ACTIVITY LOGS
 */

export function subscribeUserActivity(
  userId: string,
  onActivity: (activity: ActivityLogItem[]) => void
): () => void {
  const q = query(
    collection(db, 'activity'),
    where('userId', '==', userId),
    limit(40)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: ActivityLogItem[] = [];
      snapshot.forEach((d) => logs.push(d.data() as ActivityLogItem));
      // Sort in-memory to prevent complex composite index requirements
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onActivity(logs);
    },
    (err) => {
      console.warn('Activity listener notice:', err);
    }
  );
}

export async function logActivity(
  userId: string,
  action: ActivityLogItem['action'],
  targetName: string,
  targetType: ActivityLogItem['targetType'],
  details?: string
): Promise<void> {
  try {
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(db, 'activity', id);
    const item: ActivityLogItem = {
      id,
      userId,
      action,
      targetName,
      targetType,
      timestamp: new Date().toISOString(),
      details,
    };
    await setDoc(logRef, cleanFirestoreData(item));
  } catch (e) {
    // Non-blocking audit logger
  }
}

/**
 * SMART MEMORY - User Preferences persistence in user profile
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    const existingPrefs = snap.exists() ? snap.data()?.preferences || {} : {};
    await updateDoc(userRef, {
      preferences: {
        ...existingPrefs,
        ...preferences,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not update user preferences in Firestore:', err);
  }
}

/**
 * Clears user's audit and activity history log
 */
export async function clearUserActivityLogs(userId: string): Promise<void> {
  try {
    const q = query(collection(db, 'activity'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.warn('Could not clear activity logs:', err);
  }
}

