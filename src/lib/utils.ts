import { FileCategory } from '../types';

/**
 * Formats byte values in decimal GB (standard for INFCLOUD 988 GB quota) or binary GiB
 */
export function formatBytes(bytes: number, binary = false): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';

  const k = binary ? 1024 : 1000;
  const sizes = binary
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  const value = bytes / Math.pow(k, safeI);

  return `${value.toFixed(value >= 100 || safeI === 0 ? 0 : 2)} ${sizes[safeI]}`;
}

/**
 * Categorizes a file based on MIME type and extension
 */
export function getFileCategory(mimeType: string, filename: string): FileCategory {
  const mime = (mimeType || '').toLowerCase();
  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext)) {
    return 'images';
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', '3gp'].includes(ext)) {
    return 'videos';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (
    mime.includes('pdf') ||
    mime.includes('document') ||
    mime.includes('word') ||
    mime.includes('text') ||
    mime.includes('sheet') ||
    mime.includes('presentation') ||
    ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'json'].includes(ext)
  ) {
    return 'documents';
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('archive') ||
    mime.includes('compressed') ||
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)
  ) {
    return 'archives';
  }
  return 'other';
}

/**
 * Formats ISO date into human-readable string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Cryptographically secure random token generation for shares
 */
export function generateSecureToken(length = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 hash for share passwords
 */
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
