/**
 * INFCLOUD - Unified IndexedDB Storage Engine
 * Single authoritative database ('infcloud_store' v3) for:
 * 1. 'objects': zero-latency media cache for small files (< 25MB)
 * 2. 'upload_queue': persistent upload tasks across refreshes
 * 3. 'upload_sessions': chunked resumable upload session states
 */

export const DB_NAME = 'infcloud_store';
export const DB_VERSION = 3;

export const STORES = {
  OBJECTS: 'objects',
  UPLOAD_QUEUE: 'upload_queue',
  UPLOAD_SESSIONS: 'upload_sessions',
} as const;

export interface UploadSessionRecord {
  id: string; // uploadSessionId
  userId: string;
  name: string;
  size: number;
  mimeType: string;
  storageKey: string;
  parentFolderId: string | null;
  isVault?: boolean;
  chunkSize: number;
  bytesUploaded: number;
  nextChunkIndex: number;
  totalChunks: number;
  status: 'uploading' | 'paused' | 'retrying' | 'error' | 'completed';
  startedAt: string;
  lastActivityAt: string;
}

let dbInstancePromise: Promise<IDBDatabase> | null = null;

export function openAppDB(): Promise<IDBDatabase> {
  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;

      // 1. 'objects' store for offline/preview caches
      if (!db.objectStoreNames.contains(STORES.OBJECTS)) {
        db.createObjectStore(STORES.OBJECTS, { keyPath: 'key' });
      }

      // 2. 'upload_queue' store for task history and persistent queue
      if (!db.objectStoreNames.contains(STORES.UPLOAD_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.UPLOAD_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('by_user', 'userId', { unique: false });
        queueStore.createIndex('by_status', 'status', { unique: false });
      } else {
        const queueStore = request.transaction?.objectStore(STORES.UPLOAD_QUEUE);
        if (queueStore && !queueStore.indexNames.contains('by_user')) {
          queueStore.createIndex('by_user', 'userId', { unique: false });
        }
        if (queueStore && !queueStore.indexNames.contains('by_status')) {
          queueStore.createIndex('by_status', 'status', { unique: false });
        }
      }

      // 3. 'upload_sessions' store for resumable chunked upload recovery
      if (!db.objectStoreNames.contains(STORES.UPLOAD_SESSIONS)) {
        const sessionStore = db.createObjectStore(STORES.UPLOAD_SESSIONS, { keyPath: 'id' });
        sessionStore.createIndex('by_user', 'userId', { unique: false });
        sessionStore.createIndex('by_key', 'storageKey', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbInstancePromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbInstancePromise = null;
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbInstancePromise;
}

// --- OBJECTS STORE (Media / Preview Cache) ---

export async function putIDBObject(key: string, blob: Blob, mimeType: string): Promise<void> {
  // Only cache files under 25MB in IndexedDB to avoid QuotaExceededError on devices
  if (blob.size > 25 * 1024 * 1024) {
    return;
  }

  try {
    const db = await openAppDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OBJECTS, 'readwrite');
      const store = tx.objectStore(STORES.OBJECTS);
      const item = {
        key,
        blob,
        mimeType,
        size: blob.size,
        updatedAt: Date.now(),
      };
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IDB put error (ignored to preserve application state):', err);
  }
}

export async function getIDBObject(key: string): Promise<Blob | null> {
  try {
    const db = await openAppDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OBJECTS, 'readonly');
      const store = tx.objectStore(STORES.OBJECTS);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob as Blob);
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

export async function deleteIDBObject(key: string): Promise<void> {
  try {
    const db = await openAppDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OBJECTS, 'readwrite');
      const store = tx.objectStore(STORES.OBJECTS);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IDB delete warning:', err);
  }
}

// --- UPLOAD SESSIONS (Resumable Chunk Recovery) ---

export async function saveUploadSession(session: UploadSessionRecord): Promise<void> {
  try {
    const db = await openAppDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.UPLOAD_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORES.UPLOAD_SESSIONS);
      const req = store.put(session);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save upload session to IDB:', err);
  }
}

export async function getUploadSession(id: string): Promise<UploadSessionRecord | null> {
  try {
    const db = await openAppDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.UPLOAD_SESSIONS, 'readonly');
      const store = tx.objectStore(STORES.UPLOAD_SESSIONS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteUploadSession(id: string): Promise<void> {
  try {
    const db = await openAppDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.UPLOAD_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORES.UPLOAD_SESSIONS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not delete upload session from IDB:', err);
  }
}

export async function getActiveSessionsForUser(userId: string): Promise<UploadSessionRecord[]> {
  try {
    const db = await openAppDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.UPLOAD_SESSIONS, 'readonly');
      const store = tx.objectStore(STORES.UPLOAD_SESSIONS);
      const index = store.index('by_user');
      const req = index.getAll(userId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}
