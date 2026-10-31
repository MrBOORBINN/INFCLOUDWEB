/**
 * INFCLOUD - Persistent Upload Queue Engine
 * "Pause Now, Resume After 10 Days"
 *
 * Persists active, paused, pending, and completed upload tasks in IndexedDB.
 * Preserves file buffers/blobs where supported so transfers can be resumed
 * across browser refreshes, restarts, or days later.
 */

import { TransferItem } from '../types';
import { openAppDB, STORES } from './idb';

const QUEUE_STORE = STORES.UPLOAD_QUEUE;

interface StoredQueueRecord {
  id: string;
  userId: string;
  name: string;
  size: number;
  mimeType: string;
  progress: number;
  bytesTransferred: number;
  speed: string;
  tmbFormatted?: string;
  networkType?: string;
  etaFormatted?: string;
  serverNode?: string;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'canceled';
  type: 'upload' | 'download';
  error?: string;
  parentFolderId: string | null;
  isVault?: boolean;
  startedAt: string;
  completedAt?: string;
  lastSavedAt: string;
  storageKey?: string;
  hasStoredBlob: boolean;
  blob?: Blob;
}

function openQueueDB(): Promise<IDBDatabase> {
  return openAppDB();
}

/**
 * Persists an upload task to IndexedDB.
 * If file blob is under 200MB, also stores the blob so user can resume anytime without re-selecting.
 */
export async function saveTaskToQueue(
  userId: string,
  task: TransferItem,
  fileBlob?: Blob
): Promise<void> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);

      // Decide whether to store blob based on size (under 200MB safe limit for IndexedDB)
      const canStoreBlob = !!fileBlob && fileBlob.size < 200 * 1024 * 1024;

      const record: StoredQueueRecord = {
        id: task.id,
        userId,
        name: task.name,
        size: task.size,
        mimeType: task.mimeType,
        progress: task.progress,
        bytesTransferred: task.bytesTransferred,
        speed: task.speed || '0 KB/s',
        tmbFormatted: task.tmbFormatted,
        networkType: task.networkType,
        etaFormatted: task.etaFormatted,
        serverNode: task.serverNode,
        status: task.status,
        type: task.type,
        error: task.error,
        parentFolderId: task.parentFolderId,
        isVault: task.isVault,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        lastSavedAt: new Date().toISOString(),
        storageKey: task.storageKey,
        hasStoredBlob: canStoreBlob,
        ...(canStoreBlob ? { blob: fileBlob } : {}),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save task to IndexedDB queue:', err);
  }
}

/**
 * Updates partial status or progress of an existing queued task in IndexedDB.
 */
export async function updateTaskInQueue(
  id: string,
  updates: Partial<StoredQueueRecord>
): Promise<void> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        if (!getReq.result) {
          resolve();
          return;
        }
        const updated = {
          ...getReq.result,
          ...updates,
          lastSavedAt: new Date().toISOString(),
        };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('Could not update task in queue:', err);
  }
}

/**
 * Loads all persistent tasks for the current user.
 * Any task previously in "uploading" state before app was closed is transitioned to "paused".
 */
export async function loadAllQueueTasks(userId: string): Promise<TransferItem[]> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const index = store.index('by_user');
      const req = index.getAll(userId);

      req.onsuccess = () => {
        const records = (req.result || []) as StoredQueueRecord[];
        const items: TransferItem[] = records.map((rec) => {
          // If the app closed during an upload, it is now safely paused
          const effectiveStatus = rec.status === 'uploading' ? 'paused' : rec.status;
          return {
            id: rec.id,
            name: rec.name,
            size: rec.size,
            mimeType: rec.mimeType,
            progress: rec.progress,
            bytesTransferred: rec.bytesTransferred,
            speed: rec.speed,
            tmbFormatted: rec.tmbFormatted,
            networkType: rec.networkType,
            etaFormatted: rec.etaFormatted,
            serverNode: rec.serverNode,
            status: effectiveStatus,
            type: rec.type,
            error: rec.error,
            parentFolderId: rec.parentFolderId,
            isVault: rec.isVault,
            startedAt: rec.startedAt,
            completedAt: rec.completedAt,
            lastSavedAt: rec.lastSavedAt,
            storageKey: rec.storageKey,
            needsReselect: !rec.hasStoredBlob,
          };
        });

        // Sort: newest first
        items.sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not load tasks from queue:', err);
    return [];
  }
}

/**
 * Retrieves the stored Blob for a queued task if available.
 */
export async function getTaskBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.get(id);

      req.onsuccess = () => {
        const record = req.result as StoredQueueRecord | undefined;
        if (record && record.blob) {
          resolve(record.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Removes a task completely from the persistent queue.
 */
export async function removeTaskFromQueue(id: string): Promise<void> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not remove task from queue:', err);
  }
}

/**
 * Clears all completed or canceled tasks for the user.
 */
export async function clearCompletedFromQueue(userId: string): Promise<void> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const index = store.index('by_user');
      const req = index.getAll(userId);

      req.onsuccess = () => {
        const records = (req.result || []) as StoredQueueRecord[];
        for (const rec of records) {
          if (rec.status === 'completed' || rec.status === 'canceled') {
            store.delete(rec.id);
          }
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not clear completed from queue:', err);
  }
}
