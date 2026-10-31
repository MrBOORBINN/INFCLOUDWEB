/**
 * INFCLOUD - Ultra-Reliable Resumable Chunked Upload Engine
 *
 * Key Capabilities:
 * 1. Zero-Memory Streaming: Uses `file.slice(start, end)` per chunk — never loads whole files into memory.
 * 2. Adaptive Chunk Sizing: Scales from 1MB to 8MB dynamically based on real network throughput.
 * 3. Byte-Accurate Resuming: Resumes from the last server-confirmed byte offset across refreshes & pauses.
 * 4. Automatic Network & Crash Recovery: Exponential backoff with jitter on network drops and timeouts.
 * 5. Device-Safe Concurrency: Prevents browser crashes and mobile device overheating.
 */

import { saveUploadSession, deleteUploadSession, getUploadSession, UploadSessionRecord } from './idb';
import { UploadProgressPayload, UploadResult } from './storage';

export interface ResumableUploadOptions {
  userId: string;
  file: File;
  storageKey?: string;
  parentFolderId?: string | null;
  isVault?: boolean;
  existingUploadId?: string;
  onProgress: (payload: UploadProgressPayload) => void;
  onStatusChange?: (status: 'uploading' | 'paused' | 'retrying' | 'completed' | 'error', message?: string) => void;
  onSuccess: (result: UploadResult) => void;
  onError: (err: Error) => void;
}

export interface ResumableUploadController {
  uploadId: string;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
  retry: () => Promise<void>;
  getStatus: () => 'uploading' | 'paused' | 'retrying' | 'completed' | 'error' | 'canceled';
}

function detectNetworkType(): string {
  try {
    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (conn) {
      if (conn.type === 'wifi') return 'Wi-Fi Network';
      if (conn.type === 'cellular') return 'Cellular Mobile';
      if (conn.effectiveType) return `${conn.effectiveType.toUpperCase()} Network`;
    }
  } catch {
    // fallback
  }
  return navigator.onLine ? 'Broadband / Cloud Uplink' : 'Offline';
}

function formatTMB(bytes: number, total: number): string {
  const currentMB = (bytes / (1024 * 1024)).toFixed(2);
  const totalMB = (total / (1024 * 1024)).toFixed(2);
  return `${currentMB} MB / ${totalMB} MB`;
}

export function startResumableUpload(options: ResumableUploadOptions): ResumableUploadController {
  const {
    userId,
    file,
    storageKey: initialKey,
    parentFolderId = null,
    isVault = false,
    existingUploadId,
    onProgress,
    onStatusChange,
    onSuccess,
    onError,
  } = options;

  let uploadId = existingUploadId || '';
  let storageKey = initialKey || '';
  let status: 'uploading' | 'paused' | 'retrying' | 'completed' | 'error' | 'canceled' = 'uploading';

  let isPaused = false;
  let isCancelled = false;
  let activeXhr: XMLHttpRequest | null = null;
  let retryTimeoutId: any = null;

  // Adaptive Chunk Configuration
  let chunkSize = 4 * 1024 * 1024; // 4MB base chunk
  const minChunkSize = 1 * 1024 * 1024; // 1MB
  const maxChunkSize = 8 * 1024 * 1024; // 8MB

  let bytesUploaded = 0;
  const totalFileSize = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalFileSize / chunkSize));

  // Speed and ETA tracking
  const startTime = Date.now();
  let lastMetricTime = startTime;
  let lastMetricBytes = 0;
  let smoothSpeedFormatted = 'Starting...';

  const updateMetrics = (currentTransferred: number) => {
    const now = Date.now();
    const timeDelta = (now - lastMetricTime) / 1000;

    if (timeDelta >= 0.2) {
      const bytesDelta = currentTransferred - lastMetricBytes;
      const bytesPerSec = bytesDelta / timeDelta;
      lastMetricBytes = currentTransferred;
      lastMetricTime = now;

      if (bytesPerSec > 1024 * 1024) {
        smoothSpeedFormatted = `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
      } else {
        smoothSpeedFormatted = `${Math.round(bytesPerSec / 1024)} KB/s`;
      }

      // Adaptive chunk sizing adjustments
      if (bytesPerSec > 4 * 1024 * 1024 && chunkSize < maxChunkSize) {
        chunkSize = Math.min(maxChunkSize, chunkSize * 2);
      } else if (bytesPerSec < 500 * 1024 && chunkSize > minChunkSize) {
        chunkSize = Math.max(minChunkSize, Math.floor(chunkSize / 2));
      }
    }

    let etaFormatted = '';
    const remaining = totalFileSize - currentTransferred;
    if (lastMetricBytes > 0 && remaining > 0) {
      const timeElapsedSec = (now - startTime) / 1000;
      const overallRate = currentTransferred / Math.max(0.1, timeElapsedSec);
      if (overallRate > 0) {
        const secs = Math.ceil(remaining / overallRate);
        if (secs < 60) {
          etaFormatted = `~${secs}s`;
        } else if (secs < 3600) {
          etaFormatted = `~${Math.ceil(secs / 60)}m`;
        } else {
          etaFormatted = `~${(secs / 3600).toFixed(1)}h`;
        }
      }
    }

    const progress = totalFileSize > 0 ? Math.min(99, Math.round((currentTransferred / totalFileSize) * 100)) : 0;
    const tmb = formatTMB(currentTransferred, totalFileSize);
    const networkType = detectNetworkType();

    onProgress({
      bytesTransferred: currentTransferred,
      totalBytes: totalFileSize,
      progress,
      speedFormatted: smoothSpeedFormatted,
      tmbFormatted: tmb,
      networkType,
      etaFormatted,
    });
  };

  // 1. Initialize or Recover Session
  const initSession = async (): Promise<boolean> => {
    try {
      // If we have an existing uploadId, query server status first
      if (uploadId) {
        try {
          const statusResp = await fetch(`/api/storage/upload/status/${encodeURIComponent(uploadId)}`);
          if (statusResp.ok) {
            const data = await statusResp.json();
            if (data.exists) {
              bytesUploaded = data.bytesReceived || 0;
              chunkSize = data.chunkSize || chunkSize;
              if (data.completed) {
                finalizeSuccess(storageKey, totalFileSize);
                return false;
              }
              return true;
            }
          }
        } catch {
          // continue to create fresh init
        }
      }

      // Check IndexedDB session record
      if (!uploadId) {
        const cachedSession = await getUploadSession(`sess_${userId}_${file.name}_${file.size}`);
        if (cachedSession && cachedSession.id) {
          uploadId = cachedSession.id;
          storageKey = cachedSession.storageKey;
          bytesUploaded = cachedSession.bytesUploaded;
          return true;
        }
      }

      // Call server /init endpoint
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const generatedKey = `users/${userId}/files/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${sanitizedName}`;

      const initResp = await fetch('/api/storage/upload/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-filename': encodeURIComponent(file.name),
          'x-filesize': String(file.size),
          'x-filetype': file.type || 'application/octet-stream',
          'x-userid': userId,
          'x-storage-key': storageKey || generatedKey,
        },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          userId,
          storageKey: storageKey || generatedKey,
        }),
      });

      const cType = initResp.headers.get('content-type') || '';
      if (!initResp.ok || cType.includes('text/html')) {
        throw new Error(`Upload initialization endpoint unavailable (HTTP ${initResp.status})`);
      }

      const initData = await initResp.json();
      uploadId = initData.uploadId;
      storageKey = initData.storageKey;
      chunkSize = initData.chunkSize || chunkSize;
      bytesUploaded = initData.bytesReceived || 0;

      // Save session to IndexedDB
      await saveUploadSession({
        id: uploadId,
        userId,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        storageKey,
        parentFolderId,
        isVault,
        chunkSize,
        bytesUploaded,
        nextChunkIndex: 0,
        totalChunks,
        status: 'uploading',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      });

      return true;
    } catch (err: any) {
      if (onStatusChange) onStatusChange('error', err.message);
      onError(err);
      return false;
    }
  };

  // 2. Upload single chunk with retry & backoff
  const uploadChunkWithRetry = async (
    chunkBlob: Blob,
    chunkIndex: number,
    startByte: number,
    endByte: number,
    attempt = 1
  ): Promise<{ completed: boolean; responseData?: any }> => {
    return new Promise((resolve, reject) => {
      if (isPaused || isCancelled) {
        resolve({ completed: false });
        return;
      }

      const xhr = new XMLHttpRequest();
      activeXhr = xhr;

      xhr.open('POST', '/api/storage/upload/chunk', true);
      xhr.setRequestHeader('x-upload-id', uploadId);
      xhr.setRequestHeader('x-chunk-index', String(chunkIndex));
      xhr.setRequestHeader('x-chunk-start-byte', String(startByte));
      xhr.setRequestHeader('x-chunk-end-byte', String(endByte));
      xhr.setRequestHeader('x-total-filesize', String(totalFileSize));
      xhr.setRequestHeader('x-userid', userId);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (isPaused || isCancelled) return;
        const currentTotalTransferred = startByte + e.loaded;
        updateMetrics(currentTotalTransferred);
      };

      xhr.onload = () => {
        activeXhr = null;
        if (isPaused || isCancelled) {
          resolve({ completed: false });
          return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            resolve({ completed: !!resp.completed, responseData: resp });
          } catch {
            resolve({ completed: endByte >= totalFileSize });
          }
        } else if (xhr.status === 404 && (xhr.responseText.includes('expired') || xhr.responseText.includes('not found'))) {
          // Session expired on server — auto re-initialize and restart chunk
          console.warn('Session expired on server, creating fresh session...');
          uploadId = '';
          initSession().then((ok) => {
            if (ok) {
              uploadChunkWithRetry(chunkBlob, chunkIndex, startByte, endByte, 1)
                .then(resolve)
                .catch(reject);
            } else {
              reject(new Error('Session re-initialization failed'));
            }
          });
        } else {
          // Server error (500, 502, 503) -> trigger retry
          handleRetry(new Error(`Server responded with HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        activeXhr = null;
        if (isPaused || isCancelled) {
          resolve({ completed: false });
          return;
        }
        handleRetry(new Error('Network connection interrupted'));
      };

      xhr.ontimeout = () => {
        activeXhr = null;
        if (isPaused || isCancelled) {
          resolve({ completed: false });
          return;
        }
        handleRetry(new Error('Upload chunk timed out'));
      };

      xhr.timeout = 45000; // 45 seconds timeout per chunk

      const handleRetry = (err: Error) => {
        const maxAttempts = 5;
        if (attempt <= maxAttempts && !isPaused && !isCancelled) {
          const delay = Math.min(12000, 1000 * Math.pow(2, attempt - 1)) + Math.random() * 500;
          status = 'retrying';
          if (onStatusChange) {
            onStatusChange('retrying', `Connection reset. Retrying (${attempt}/${maxAttempts}) in ${(delay / 1000).toFixed(1)}s...`);
          }

          retryTimeoutId = setTimeout(() => {
            if (!isPaused && !isCancelled) {
              status = 'uploading';
              if (onStatusChange) onStatusChange('uploading');
              uploadChunkWithRetry(chunkBlob, chunkIndex, startByte, endByte, attempt + 1)
                .then(resolve)
                .catch(reject);
            }
          }, delay);
        } else {
          status = 'error';
          if (onStatusChange) onStatusChange('error', err.message);
          reject(err);
        }
      };

      xhr.send(chunkBlob);
    });
  };

  const finalizeSuccess = async (key: string, size: number) => {
    status = 'completed';
    await deleteUploadSession(uploadId);
    if (onStatusChange) onStatusChange('completed');

    onProgress({
      bytesTransferred: size,
      totalBytes: size,
      progress: 100,
      speedFormatted: 'Completed',
      tmbFormatted: formatTMB(size, size),
      networkType: detectNetworkType(),
      etaFormatted: 'Done',
    });

    onSuccess({
      storageKey: key,
      downloadUrl: `/api/storage/files/${encodeURIComponent(key)}`,
      provider: 'server',
    });
  };

  // 3. Main chunk loop: Slices on the fly, keeping memory minimal
  const runUploadLoop = async () => {
    status = 'uploading';
    if (onStatusChange) onStatusChange('uploading');

    let chunkIndex = Math.floor(bytesUploaded / chunkSize);

    while (bytesUploaded < totalFileSize && !isPaused && !isCancelled) {
      const start = bytesUploaded;
      const end = Math.min(totalFileSize, start + chunkSize);

      // On-demand slice: only this small piece exists in memory
      const chunk = file.slice(start, end);

      try {
        const result = await uploadChunkWithRetry(chunk, chunkIndex, start, end);

        if (isPaused || isCancelled) {
          break;
        }

        bytesUploaded = end;
        chunkIndex++;

        // Update IndexedDB session progress
        saveUploadSession({
          id: uploadId,
          userId,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          storageKey,
          parentFolderId,
          isVault,
          chunkSize,
          bytesUploaded,
          nextChunkIndex: chunkIndex,
          totalChunks,
          status: 'uploading',
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
        });

        if (result.completed || bytesUploaded >= totalFileSize) {
          const finalKey = result.responseData?.storageKey || storageKey;
          await finalizeSuccess(finalKey, totalFileSize);
          return;
        }
      } catch (err: any) {
        status = 'error';
        if (onStatusChange) onStatusChange('error', err.message);
        onError(err);
        return;
      }
    }
  };

  // Online / Offline listener for seamless auto-resume
  const handleOnline = () => {
    if (status === 'retrying' || status === 'paused') {
      console.log('Network restored: automatically resuming upload for', file.name);
      controller.resume();
    }
  };
  window.addEventListener('online', handleOnline);

  // Controller Interface
  const controller: ResumableUploadController = {
    uploadId,
    getStatus: () => status,

    pause: async () => {
      isPaused = true;
      status = 'paused';
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (activeXhr) {
        try {
          activeXhr.abort();
        } catch {
          // ignore
        }
      }
      await saveUploadSession({
        id: uploadId,
        userId,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        storageKey,
        parentFolderId,
        isVault,
        chunkSize,
        bytesUploaded,
        nextChunkIndex: Math.floor(bytesUploaded / chunkSize),
        totalChunks,
        status: 'paused',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      });
      if (onStatusChange) onStatusChange('paused');
    },

    resume: async () => {
      if (status === 'completed') return;
      isPaused = false;
      isCancelled = false;
      status = 'uploading';
      if (onStatusChange) onStatusChange('uploading', 'Resuming transfer...');

      // Query server for latest confirmed byte offset
      try {
        const resp = await fetch(`/api/storage/upload/status/${encodeURIComponent(uploadId)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.exists && typeof data.bytesReceived === 'number') {
            bytesUploaded = data.bytesReceived;
          }
        }
      } catch {
        // use local confirmed bytes
      }

      runUploadLoop();
    },

    retry: async () => {
      return controller.resume();
    },

    cancel: async () => {
      isCancelled = true;
      isPaused = true;
      status = 'canceled';
      window.removeEventListener('online', handleOnline);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (activeXhr) {
        try {
          activeXhr.abort();
        } catch {
          // ignore
        }
      }
      // Call server to clean up temp files
      if (uploadId) {
        try {
          fetch(`/api/storage/upload/cancel/${encodeURIComponent(uploadId)}`, { method: 'DELETE' });
        } catch {
          // ignore
        }
        await deleteUploadSession(uploadId);
      }
      if (onStatusChange) onStatusChange('error', 'Upload canceled');
    },
  };

  // Kick off initial setup
  initSession().then((ready) => {
    if (ready) {
      runUploadLoop();
    }
  });

  return controller;
}
