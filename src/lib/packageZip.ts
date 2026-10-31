/**
 * INFCLOUD - Package ZIP Generation & Download Engine
 * Preserves directory structure, manages memory efficiently,
 * and provides live packing progress updates.
 */

import JSZip from 'jszip';
import { FilePackage, PackageItemFile } from '../types';
import { getIDBObject } from './idb';
import { getStorageUrl } from './storage';

export interface ZipProgressPayload {
  phase: 'fetching' | 'compressing' | 'complete' | 'error';
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  percent: number; // 0 - 100
  bytesProcessed: number;
  totalBytes: number;
}

/**
 * Downloads all files within a package as a ZIP archive, preserving full folder hierarchy.
 */
export async function downloadPackageAsZip(
  pkg: FilePackage,
  onProgress?: (progress: ZipProgressPayload) => void
): Promise<Blob> {
  const zip = new JSZip();
  const totalFiles = pkg.items.length;
  const totalBytes = pkg.totalSize;
  let bytesProcessed = 0;

  for (let i = 0; i < totalFiles; i++) {
    const item = pkg.items[i];
    const itemPath = (item.path || item.name).replace(/^\/+/, ''); // Ensure relative path without leading slash

    if (onProgress) {
      onProgress({
        phase: 'fetching',
        currentFileIndex: i + 1,
        totalFiles,
        currentFileName: itemPath,
        percent: Math.round(((i) / totalFiles) * 80),
        bytesProcessed,
        totalBytes,
      });
    }

    let blob: Blob | null = null;

    // 1. Try local IndexedDB cache first (instant, 0 network bandwidth)
    try {
      blob = await getIDBObject(item.storageKey);
    } catch {
      // Continue to network
    }

    // 2. Fetch over network (dedicated server node or Firebase storage)
    if (!blob) {
      let downloadUrl = item.downloadUrl;
      if (!downloadUrl) {
        downloadUrl = await getStorageUrl(item.storageKey) || undefined;
      }

      if (!downloadUrl) {
        throw new Error(`Unable to resolve download URL for file: ${item.name}`);
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${item.name} (HTTP ${response.status})`);
      }
      blob = await response.blob();
    }

    // Add to zip preserving directory path
    zip.file(itemPath, blob);
    bytesProcessed += item.size;
  }

  // Generate ZIP Archive with compression
  if (onProgress) {
    onProgress({
      phase: 'compressing',
      currentFileIndex: totalFiles,
      totalFiles,
      currentFileName: 'Building ZIP Archive...',
      percent: 85,
      bytesProcessed,
      totalBytes,
    });
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        const percent = Math.min(99, Math.round(85 + (metadata.percent * 0.14)));
        onProgress({
          phase: 'compressing',
          currentFileIndex: totalFiles,
          totalFiles,
          currentFileName: metadata.currentFile ? `Packing ${metadata.currentFile}...` : 'Compressing...',
          percent,
          bytesProcessed,
          totalBytes,
        });
      }
    }
  );

  if (onProgress) {
    onProgress({
      phase: 'complete',
      currentFileIndex: totalFiles,
      totalFiles,
      currentFileName: 'Package ZIP Ready',
      percent: 100,
      bytesProcessed: totalBytes,
      totalBytes,
    });
  }

  // Trigger browser download
  const safePkgName = pkg.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'package';
  const fileName = `${safePkgName}_${pkg.accessCode}.zip`;
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);

  return zipBlob;
}
