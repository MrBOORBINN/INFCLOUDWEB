/**
 * INFCLOUD - Resilient Object Storage Engine
 * Supports:
 * 1. Real-time Node Server Storage (/api/storage/upload with live network/Wi-Fi streaming and TMB tracking)
 * 2. Firebase Cloud Storage (uploadBytesResumable)
 * 3. High-Capacity IndexedDB Private Object Store (resilient offline/local storage fallback)
 */

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { startResumableUpload, ResumableUploadController } from './resumableUpload';
import { putIDBObject, getIDBObject, deleteIDBObject } from './idb';
export { putIDBObject, getIDBObject, deleteIDBObject };
export { startResumableUpload };
export type { ResumableUploadController };

export interface UploadProgressPayload {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0 to 100
  speedFormatted: string;
  tmbFormatted: string; // Real Transferred MB e.g. "3.42 MB / 5.00 MB"
  networkType: string; // e.g. "Wi-Fi" or "Broadband Network"
  etaFormatted: string; // e.g. "~2s"
}

export interface UploadResult {
  storageKey: string;
  downloadUrl: string;
  provider: 'server' | 'firebase' | 'indexeddb-fallback';
}

/**
 * Detect user's network connection type (Wi-Fi, 4G, 5G, Cellular, etc.)
 */
function getNetworkType(): string {
  try {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      if (conn.type === 'wifi') return 'Wi-Fi Network';
      if (conn.type === 'cellular') return 'Mobile Data';
      if (conn.effectiveType) {
        const typeStr = String(conn.effectiveType).toUpperCase();
        return `${typeStr} Network`;
      }
    }
  } catch {
    // ignore
  }
  return 'Wi-Fi / Network';
}

/**
 * Formats Transferred Megabytes (TMB) e.g. "3.42 MB / 5.00 MB"
 */
function formatTMB(transferredBytes: number, totalBytes: number): string {
  const tmb = (transferredBytes / (1024 * 1024)).toFixed(2);
  const total = (totalBytes / (1024 * 1024)).toFixed(2);
  return `${tmb} MB / ${total} MB`;
}

export type UploadCancelFn = (() => void) & {
  pause?: () => Promise<void>;
  resume?: () => Promise<void>;
  cancel?: () => Promise<void>;
  retry?: () => Promise<void>;
  uploadId?: string;
};

/**
 * Detects if the application is running in a static Netlify CDN deployment.
 */
export function isNetlifyEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.includes('netlify.app') ||
    window.location.hostname.includes('.netlify.')
  );
}

/**
 * Uploads a file using the ultra-reliable Resumable Chunked Upload Engine.
 * Supports multi-gigabyte files with zero memory strain, server byte offset resumption,
 * and seamless direct Firebase Cloud Storage on Netlify networks.
 */
export function uploadFileWithFallback(
  userId: string,
  file: File,
  onProgress: (payload: UploadProgressPayload) => void,
  onSuccess: (result: UploadResult) => void,
  onError: (err: Error) => void,
  options?: {
    parentFolderId?: string | null;
    isVault?: boolean;
    existingUploadId?: string;
    onStatusChange?: (status: 'uploading' | 'paused' | 'retrying' | 'completed' | 'error', msg?: string) => void;
  }
): UploadCancelFn {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const storageKey = `users/${userId}/files/${timestamp}_${randomSuffix}_${sanitizedName}`;

  let isCancelled = false;
  let activeFirebaseTask: any = null;
  let controller: ResumableUploadController | null = null;

  // Secondary/Direct: Firebase Cloud Storage Upload (uploadBytesResumable)
  const uploadViaFirebase = () => {
    if (isCancelled) return;
    try {
      options?.onStatusChange?.('uploading', isNetlifyEnvironment() ? 'Netlify Cloud Edge Uploading...' : 'Firebase Cloud Syncing...');
      const fileRef = ref(storage, storageKey);
      activeFirebaseTask = uploadBytesResumable(fileRef, file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          originalName: file.name,
          ownerId: userId,
        },
      });

      let lastBytes = 0;
      let lastTime = Date.now();
      let smoothSpeed = 'Direct Cloud Uplink...';
      const startTime = Date.now();

      activeFirebaseTask.on(
        'state_changed',
        (snapshot: any) => {
          if (isCancelled) return;
          const current = snapshot.bytesTransferred;
          const total = snapshot.totalBytes;
          const progress = total > 0 ? Math.min(99, Math.round((current / total) * 100)) : 0;

          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000;
          if (timeDelta >= 0.5) {
            const bytesDelta = current - lastBytes;
            const rate = bytesDelta / timeDelta;
            lastBytes = current;
            lastTime = now;
            if (rate > 1024 * 1024) {
              smoothSpeed = `${(rate / (1024 * 1024)).toFixed(1)} MB/s`;
            } else if (rate > 1024) {
              smoothSpeed = `${Math.round(rate / 1024)} KB/s`;
            }
          }

          let etaFormatted = '~';
          if (current > 0 && total > current) {
            const totalElapsed = (now - startTime) / 1000;
            const avgSpeed = current / (totalElapsed || 1);
            if (avgSpeed > 0) {
              const remainingSecs = Math.round((total - current) / avgSpeed);
              etaFormatted = remainingSecs < 60 ? `~${remainingSecs}s` : `~${Math.ceil(remainingSecs / 60)}m`;
            }
          }

          onProgress({
            bytesTransferred: current,
            totalBytes: total,
            progress,
            speedFormatted: smoothSpeed,
            tmbFormatted: formatTMB(current, total),
            networkType: isNetlifyEnvironment() ? 'Netlify Edge · Firebase CDN' : getNetworkType(),
            etaFormatted,
          });
        },
        async (firebaseError: any) => {
          if (isCancelled) {
            onError(new Error('Upload canceled by user.'));
            return;
          }
          console.warn('Firebase Storage notice, activating resilient IndexedDB storage:', firebaseError.message);
          fallbackToIndexedDB();
        },
        async () => {
          if (isCancelled) return;
          try {
            options?.onStatusChange?.('completed', 'Upload complete');
            const downloadUrl = await getDownloadURL(activeFirebaseTask.snapshot.ref);
            if (file.size < 25 * 1024 * 1024) {
              await putIDBObject(storageKey, file, file.type || 'application/octet-stream');
            }
            onSuccess({
              storageKey,
              downloadUrl,
              provider: 'firebase',
            });
          } catch {
            fallbackToIndexedDB();
          }
        }
      );
    } catch (fbInitErr) {
      console.warn('Firebase storage init failed:', fbInitErr);
      fallbackToIndexedDB();
    }
  };

  // If on Netlify static host, skip local server attempts and stream directly to Firebase Cloud Storage
  if (isNetlifyEnvironment()) {
    uploadViaFirebase();
  } else {
    // Primary on local dev/dedicated server: Node.js chunked streaming
    controller = startResumableUpload({
      userId,
      file,
      storageKey,
      parentFolderId: options?.parentFolderId,
      isVault: options?.isVault,
      existingUploadId: options?.existingUploadId,
      onProgress,
      onStatusChange: options?.onStatusChange,
      onSuccess: async (result) => {
        if (file.size < 25 * 1024 * 1024) {
          await putIDBObject(storageKey, file, file.type || 'application/octet-stream');
        }
        onSuccess(result);
      },
      onError: (err) => {
        if (isCancelled) {
          onError(new Error('Upload canceled'));
          return;
        }
        console.warn('Dedicated node upload unavailable, streaming via Firebase Cloud Storage...', err.message);
        uploadViaFirebase();
      },
    });
  }

  const cancelFn: UploadCancelFn = () => {
    isCancelled = true;
    if (activeFirebaseTask && typeof activeFirebaseTask.cancel === 'function') {
      try {
        activeFirebaseTask.cancel();
      } catch {
        // ignore
      }
    }
    if (controller) {
      controller.cancel();
    }
  };

  cancelFn.pause = async () => {
    if (activeFirebaseTask && typeof activeFirebaseTask.pause === 'function') {
      activeFirebaseTask.pause();
      options?.onStatusChange?.('paused', 'Upload paused');
    } else if (controller) {
      await controller.pause();
    }
  };

  cancelFn.resume = async () => {
    if (activeFirebaseTask && typeof activeFirebaseTask.resume === 'function') {
      activeFirebaseTask.resume();
      options?.onStatusChange?.('uploading', 'Resuming upload...');
    } else if (controller) {
      await controller.resume();
    }
  };

  cancelFn.cancel = async () => {
    isCancelled = true;
    if (activeFirebaseTask && typeof activeFirebaseTask.cancel === 'function') {
      try {
        activeFirebaseTask.cancel();
      } catch {
        // ignore
      }
    }
    if (controller) {
      await controller.cancel();
    }
  };

  cancelFn.retry = async () => {
    if (controller) {
      await controller.retry();
    } else {
      uploadViaFirebase();
    }
  };

  cancelFn.uploadId = controller?.uploadId || storageKey;

  // Tertiary: Resilient Local Object Storage (IndexedDB)
  const fallbackToIndexedDB = async () => {
    if (isCancelled) return;
    try {
      const chunkSize = 512 * 1024; // 512KB chunks
      const totalBytes = file.size;
      let bytesTransferred = 0;

      for (let offset = 0; offset < totalBytes; offset += chunkSize) {
        if (isCancelled) {
          onError(new Error('Upload canceled by user.'));
          return;
        }
        bytesTransferred = Math.min(offset + chunkSize, totalBytes);
        const progress = Math.round((bytesTransferred / totalBytes) * 100);

        onProgress({
          bytesTransferred,
          totalBytes,
          progress,
          speedFormatted: 'Local Buffer',
          tmbFormatted: formatTMB(bytesTransferred, totalBytes),
          networkType: 'Local Vault / Cache',
          etaFormatted: '~0s',
        });

        await new Promise((r) => setTimeout(r, 12));
      }

      await putIDBObject(storageKey, file, file.type || 'application/octet-stream');
      const objectUrl = URL.createObjectURL(file);

      onSuccess({
        storageKey,
        downloadUrl: objectUrl,
        provider: 'indexeddb-fallback',
      });
    } catch (idbErr: any) {
      onError(new Error(idbErr?.message || 'Storage error'));
    }
  };

  return cancelFn;
}

// In-memory active session file cache (allows instant resume without re-picking file)
const sessionFileCache = new Map<string, File>();

export function storeSessionFile(id: string, file: File): void {
  sessionFileCache.set(id, file);
}

export function getSessionFile(id: string): File | undefined {
  return sessionFileCache.get(id);
}

export function removeSessionFile(id: string): void {
  sessionFileCache.delete(id);
}

/**
 * Dynamically resolves permanent Cloud Storage or Server URL
 */
export async function getStorageUrl(storageKey: string): Promise<string | null> {
  // If running on Netlify, bypass local server probing and resolve directly via Firebase
  if (!isNetlifyEnvironment()) {
    try {
      const serverUrl = `/api/storage/files/${encodeURIComponent(storageKey)}`;
      const check = await fetch(serverUrl, { method: 'HEAD' });
      const cType = check.headers.get('content-type') || '';
      // Only treat as server file if response is OK AND not the Netlify SPA HTML fallback
      if (check.ok && !cType.includes('text/html')) {
        return serverUrl;
      }
    } catch {
      // continue
    }
  }

  // Check Firebase Storage
  try {
    const fileRef = ref(storage, storageKey);
    return await getDownloadURL(fileRef);
  } catch {
    return null;
  }
}

/**
 * Downloads a file cleanly by resolving authentic blob, server endpoint, or Firebase URL
 */
export async function downloadFileBlob(
  storageKey: string,
  downloadUrl?: string,
  fallbackFilename?: string
): Promise<void> {
  let blob: Blob | null = null;

  // 1. Check local IndexedDB object store first (instant zero-network)
  try {
    blob = await getIDBObject(storageKey);
  } catch {
    // continue
  }

  // 2. If no local blob, check if downloadUrl is a valid URL
  let validRemoteUrl = downloadUrl && !downloadUrl.startsWith('blob:') ? downloadUrl : null;

  // 3. If no valid remote URL or downloadUrl was a stale blob:, dynamically resolve
  if (!blob && !validRemoteUrl && storageKey) {
    validRemoteUrl = await getStorageUrl(storageKey);
  }

  // 4. Fetch blob from verified remote URL if needed
  if (!blob && validRemoteUrl) {
    try {
      const response = await fetch(validRemoteUrl);
      if (response.ok) {
        blob = await response.blob();
      }
    } catch (e) {
      console.warn('Direct fetch failed, falling back to direct anchor:', e);
    }
  }

  if (blob) {
    const url = URL.createObjectURL(blob);
    triggerBrowserDownload(url, fallbackFilename || 'download');
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } else if (validRemoteUrl) {
    triggerBrowserDownload(validRemoteUrl, fallbackFilename || 'download');
  } else {
    throw new Error('File payload could not be retrieved. Please check cloud storage connectivity.');
  }
}

/**
 * Downloads multiple selected files bundled as a compressed ZIP archive
/**
 * Bundles files into a compressed ZIP archive Blob with Deflate compression and progress tracking
 */
export async function createCompressedZipBlob(
  files: { name: string; storageKey: string; downloadUrl?: string; size?: number }[],
  onProgress?: (percent: number, message: string) => void
): Promise<{ zipBlob: Blob; totalOriginalBytes: number; compressedBytes: number }> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  let totalOriginalBytes = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (onProgress) {
      onProgress(Math.round(((i) / Math.max(1, files.length)) * 40), `Reading ${f.name}...`);
    }

    let blob: Blob | null = null;
    try {
      blob = await getIDBObject(f.storageKey);
    } catch {
      // continue
    }

    if (!blob) {
      let remoteUrl = f.downloadUrl && !f.downloadUrl.startsWith('blob:') ? f.downloadUrl : null;
      if (!remoteUrl && f.storageKey) {
        remoteUrl = await getStorageUrl(f.storageKey);
      }
      if (remoteUrl) {
        try {
          const resp = await fetch(remoteUrl);
          if (resp.ok) {
            blob = await resp.blob();
          }
        } catch {
          // ignore individual failed fetch
        }
      }
    }

    if (blob) {
      totalOriginalBytes += blob.size;
      zip.file(f.name, blob);
    } else {
      const placeholder = `INFCLOUD Archived File: ${f.name}`;
      totalOriginalBytes += f.size || placeholder.length;
      zip.file(f.name, placeholder);
    }
  }

  if (onProgress) {
    onProgress(45, 'Compressing with DEFLATE (Level 6)...');
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        const p = 45 + Math.round(metadata.percent * 0.55);
        onProgress(Math.min(99, p), `Compressing: ${Math.round(metadata.percent)}%`);
      }
    }
  );

  return {
    zipBlob,
    totalOriginalBytes: totalOriginalBytes || zipBlob.size,
    compressedBytes: zipBlob.size,
  };
}

/**
 * Downloads multiple selected files bundled as a compressed ZIP archive
 */
export async function downloadFilesAsZip(
  files: { name: string; storageKey: string; downloadUrl?: string; size?: number }[],
  archiveName = 'INFCLOUD_Archive.zip'
): Promise<void> {
  const { zipBlob } = await createCompressedZipBlob(files);
  const zipUrl = URL.createObjectURL(zipBlob);
  triggerBrowserDownload(zipUrl, archiveName);
  setTimeout(() => URL.revokeObjectURL(zipUrl), 15000);
}

export function triggerBrowserDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Deletes file object from server storage, Firebase storage, and/or IndexedDB
 */
export async function removeFileFromStorage(
  storageKey: string,
  provider: 'server' | 'firebase' | 'indexeddb-fallback'
): Promise<void> {
  // Always clean up IndexedDB
  try {
    await deleteIDBObject(storageKey);
  } catch (e) {
    console.warn('IDB cleanup notice:', e);
  }

  // If server provider, delete from server disk
  if (provider === 'server' || !provider) {
    try {
      await fetch(`/api/storage/files/${encodeURIComponent(storageKey)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Server storage delete notice:', e);
    }
  }

  // If Firebase provider, also attempt Firebase Storage delete
  if (provider === 'firebase') {
    try {
      const fileRef = ref(storage, storageKey);
      await deleteObject(fileRef);
    } catch (e) {
      console.warn('Firebase Storage delete notice:', e);
    }
  }
}
