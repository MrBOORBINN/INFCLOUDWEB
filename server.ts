import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Disable HMR in preview environment to prevent WebSocket closed errors
process.env.DISABLE_HMR = 'true';

const PORT = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');

// Ensure storage directory exists on the server
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '100mb' }));

  // CORS headers for API endpoints
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Range, x-filename, x-storage-key, x-filetype, x-filesize, x-userid, x-chunk-index, x-total-chunks, x-upload-id, x-chunk-start-byte, x-chunk-end-byte, x-total-filesize'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Storage Server Health & Real-time Node Status
  app.get('/api/storage/status', (req: Request, res: Response) => {
    try {
      let totalStoredBytes = 0;
      let totalFiles = 0;
      if (fs.existsSync(UPLOADS_DIR)) {
        const fileNames = fs
          .readdirSync(UPLOADS_DIR)
          .filter((f) => !f.endsWith('.meta.json') && !f.startsWith('.tmp_'));
        totalFiles = fileNames.length;
        for (const f of fileNames) {
          try {
            const stat = fs.statSync(path.join(UPLOADS_DIR, f));
            totalStoredBytes += stat.size;
          } catch {
            // ignore
          }
        }
      }

      res.json({
        status: 'online',
        serverTime: new Date().toISOString(),
        nodeStorage: 'INFCLOUD High-Speed Dedicated Storage Node',
        networkCapacity: '10 Gbps Cloud Fiber Uplink',
        activeStoragePath: UPLOADS_DIR,
        totalFilesOnServer: totalFiles,
        totalStoredBytes,
        features: [
          'streaming-network-upload',
          'chunked-resumable-upload',
          'byte-offset-continuation',
          'real-time-tmb-tracking',
          'http-range-media-streaming',
          'resumable-buffer-persistence',
        ],
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error' });
    }
  });

  // --- RESUMABLE CHUNKED UPLOAD PROTOCOL ---

  // 1. Initialize or query an active upload session
  app.post('/api/storage/upload/init', (req: Request, res: Response) => {
    try {
      const filename =
        (req.headers['x-filename'] ? decodeURIComponent(req.headers['x-filename'] as string) : req.body?.filename) ||
        'unnamed_file';
      const fileSize = Number(req.headers['x-filesize'] || req.body?.fileSize) || 0;
      const mimeType = (req.headers['x-filetype'] || req.body?.mimeType || 'application/octet-stream') as string;
      const userId = (req.headers['x-userid'] || req.body?.userId || 'anonymous') as string;
      const requestedKey = (req.headers['x-storage-key'] || req.body?.storageKey) as string;

      const storageKey =
        requestedKey || `users/${userId}/files/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // Configurable standard chunk size (4MB default for fast streaming without memory strain)
      const chunkSize = 4 * 1024 * 1024;
      const totalChunks = fileSize > 0 ? Math.ceil(fileSize / chunkSize) : 1;

      // Unique safe upload session ID
      const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const tempFilePath = path.join(UPLOADS_DIR, `.tmp_${safeUploadId}`);
      const sessionFilePath = path.join(UPLOADS_DIR, `.tmp_${safeUploadId}.json`);

      // Initialize empty temp file
      fs.writeFileSync(tempFilePath, Buffer.alloc(0));

      const sessionData = {
        uploadId,
        filename,
        storageKey,
        mimeType,
        fileSize,
        userId,
        chunkSize,
        totalChunks,
        bytesReceived: 0,
        chunksReceived: [] as number[],
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };

      fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2));

      res.json({
        success: true,
        uploadId,
        storageKey,
        chunkSize,
        totalChunks,
        bytesReceived: 0,
        nextOffset: 0,
      });
    } catch (err: any) {
      console.error('Upload init error:', err);
      res.status(500).json({ error: err?.message || 'Failed to initialize upload session' });
    }
  });

  // 2. Upload individual file chunk
  app.post('/api/storage/upload/chunk', (req: Request, res: Response) => {
    try {
      const uploadId = (req.headers['x-upload-id'] as string) || '';
      const chunkIndex = Number(req.headers['x-chunk-index']) || 0;
      const chunkStart = Number(req.headers['x-chunk-start-byte']) || 0;
      const chunkEnd = Number(req.headers['x-chunk-end-byte']) || 0;
      const totalFileSize = Number(req.headers['x-total-filesize']) || 0;
      const userId = (req.headers['x-userid'] as string) || 'anonymous';

      if (!uploadId) {
        return res.status(400).json({ error: 'Missing x-upload-id header' });
      }

      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const tempFilePath = path.join(UPLOADS_DIR, `.tmp_${safeUploadId}`);
      const sessionFilePath = path.join(UPLOADS_DIR, `.tmp_${safeUploadId}.json`);

      if (!fs.existsSync(tempFilePath) || !fs.existsSync(sessionFilePath)) {
        return res.status(404).json({ error: 'Upload session not found or expired', expired: true });
      }

      let sessionData: any = {};
      try {
        sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
      } catch {
        return res.status(500).json({ error: 'Failed to read upload session state' });
      }

      // Check user authorization if both are provided and non-anonymous
      if (
        userId &&
        userId !== 'anonymous' &&
        sessionData.userId &&
        sessionData.userId !== 'anonymous' &&
        sessionData.userId !== userId
      ) {
        return res.status(403).json({ error: 'Unauthorized upload session access' });
      }

      const writeStream = fs.createWriteStream(tempFilePath, {
        flags: fs.existsSync(tempFilePath) && chunkStart > 0 ? 'r+' : 'w',
        start: chunkStart,
      });

      let chunkBytesReceived = 0;
      req.on('data', (data) => {
        chunkBytesReceived += data.length;
      });

      req.pipe(writeStream);

      writeStream.on('finish', () => {
        try {
          const currentStat = fs.statSync(tempFilePath);
          const totalReceived = currentStat.size;

          // Update session record
          if (!sessionData.chunksReceived.includes(chunkIndex)) {
            sessionData.chunksReceived.push(chunkIndex);
          }
          sessionData.bytesReceived = totalReceived;
          sessionData.lastActivityAt = new Date().toISOString();
          fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2));

          const isComplete =
            totalFileSize > 0 ? totalReceived >= totalFileSize : chunkBytesReceived === 0;

          if (isComplete) {
            // Finalize upload: rename temp file to storage key
            const safeKey = sessionData.storageKey.replace(/[^a-zA-Z0-9_-]/g, '_');
            const targetFilePath = path.join(UPLOADS_DIR, safeKey);
            const metaFilePath = targetFilePath + '.meta.json';

            fs.renameSync(tempFilePath, targetFilePath);

            // Write metadata companion
            fs.writeFileSync(
              metaFilePath,
              JSON.stringify(
                {
                  originalName: sessionData.filename,
                  storageKey: sessionData.storageKey,
                  mimeType: sessionData.mimeType,
                  size: totalReceived,
                  userId: sessionData.userId,
                  uploadedAt: new Date().toISOString(),
                  uploadType: 'chunked-resumable',
                },
                null,
                2
              )
            );

            // Clean up session file
            try {
              if (fs.existsSync(sessionFilePath)) fs.unlinkSync(sessionFilePath);
            } catch {
              // ignore
            }

            return res.json({
              completed: true,
              storageKey: sessionData.storageKey,
              downloadUrl: `/api/storage/files/${encodeURIComponent(sessionData.storageKey)}`,
              size: totalReceived,
              originalName: sessionData.filename,
              provider: 'server',
              message: `Chunked upload completed! ${totalReceived} bytes committed to storage.`,
            });
          }

          // Not yet complete: acknowledge chunk
          res.json({
            completed: false,
            chunkIndex,
            bytesReceived: totalReceived,
            nextOffset: totalReceived,
          });
        } catch (postErr: any) {
          console.error('Chunk finalization error:', postErr);
          res.status(500).json({ error: postErr?.message || 'Chunk commit error' });
        }
      });

      writeStream.on('error', (err) => {
        console.error('Chunk stream error:', err);
        res.status(500).json({ error: 'Failed to write chunk to server storage' });
      });
    } catch (err: any) {
      console.error('Chunk handler error:', err);
      res.status(500).json({ error: err?.message || 'Chunk upload failed' });
    }
  });

  // 3. Query current status of an upload session (for resuming from exact byte offset)
  app.get('/api/storage/upload/status/:uploadId', (req: Request, res: Response) => {
    try {
      const uploadId = req.params.uploadId;
      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const tempFilePath = path.join(UPLOADS_DIR, `.tmp_${safeUploadId}`);
      const sessionFilePath = path.join(UPLOADS_DIR, `.tmp_${safeUploadId}.json`);

      if (!fs.existsSync(sessionFilePath)) {
        return res.json({ exists: false });
      }

      const sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
      const bytesOnDisk = fs.existsSync(tempFilePath) ? fs.statSync(tempFilePath).size : 0;

      res.json({
        exists: true,
        uploadId,
        bytesReceived: bytesOnDisk,
        nextOffset: bytesOnDisk,
        chunkSize: sessionData.chunkSize,
        fileSize: sessionData.fileSize,
        totalChunks: sessionData.totalChunks,
        chunksReceived: sessionData.chunksReceived,
        completed: sessionData.fileSize > 0 && bytesOnDisk >= sessionData.fileSize,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to query status' });
    }
  });

  // 4. Cancel active upload and delete temporary chunks on disk
  app.delete('/api/storage/upload/cancel/:uploadId', (req: Request, res: Response) => {
    try {
      const uploadId = req.params.uploadId;
      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const tempFilePath = path.join(UPLOADS_DIR, `.tmp_${safeUploadId}`);
      const sessionFilePath = path.join(UPLOADS_DIR, `.tmp_${safeUploadId}.json`);

      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (fs.existsSync(sessionFilePath)) fs.unlinkSync(sessionFilePath);

      res.json({ success: true, message: `Upload session ${uploadId} cancelled and temp chunks deleted.` });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Cancel failed' });
    }
  });

  // 5. Classic Real-time Stream Upload Endpoint (for backwards compatibility / small files)
  app.post('/api/storage/upload', (req: Request, res: Response) => {
    try {
      const rawFilename = (req.headers['x-filename'] as string) || 'unnamed_file';
      const filename = decodeURIComponent(rawFilename);
      const storageKey =
        (req.headers['x-storage-key'] as string) ||
        `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const mimeType = (req.headers['x-filetype'] as string) || 'application/octet-stream';
      const fileSize = Number(req.headers['x-filesize']) || 0;
      const userId = (req.headers['x-userid'] as string) || 'anonymous';

      // Sanitize key for filesystem security
      const safeKey = storageKey.replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetFilePath = path.join(UPLOADS_DIR, safeKey);
      const metaFilePath = targetFilePath + '.meta.json';

      const writeStream = fs.createWriteStream(targetFilePath);
      let bytesReceived = 0;

      req.on('data', (chunk) => {
        bytesReceived += chunk.length;
      });

      req.pipe(writeStream);

      writeStream.on('finish', () => {
        try {
          fs.writeFileSync(
            metaFilePath,
            JSON.stringify(
              {
                originalName: filename,
                storageKey,
                mimeType,
                size: bytesReceived,
                userId,
                uploadedAt: new Date().toISOString(),
              },
              null,
              2
            )
          );
        } catch (metaErr) {
          console.warn('Could not write companion meta:', metaErr);
        }

        res.json({
          success: true,
          storageKey,
          downloadUrl: `/api/storage/files/${encodeURIComponent(storageKey)}`,
          size: bytesReceived,
          originalName: filename,
          provider: 'server',
          message: `Successfully transferred ${bytesReceived} bytes over network to INFCLOUD server storage.`,
        });
      });

      writeStream.on('error', (err) => {
        console.error('File stream write error:', err);
        res.status(500).json({ error: 'Failed to write file to server storage' });
      });
    } catch (err: any) {
      console.error('Upload handling error:', err);
      res.status(500).json({ error: err?.message || 'Server upload failed' });
    }
  });

  // Serve stored files with HTTP 206 Range support for video/audio streaming and seek
  app.get('/api/storage/files/:key', (req: Request, res: Response) => {
    try {
      const storageKey = req.params.key;
      const safeKey = storageKey.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(UPLOADS_DIR, safeKey);
      const metaPath = filePath + '.meta.json';

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found in INFCLOUD server storage');
      }

      let meta: any = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch {
          // ignore
        }
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const mimeType = meta.mimeType || 'application/octet-stream';
      const originalName = meta.originalName || 'file';

      const range = req.headers.range;

      if (range) {
        // Support partial content streaming (critical for audio/video players)
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          return res.end();
        }

        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
        });
        fileStream.pipe(res);
      } else {
        const download = req.query.download === '1';
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Content-Disposition': download
            ? `attachment; filename="${encodeURIComponent(originalName)}"`
            : `inline; filename="${encodeURIComponent(originalName)}"`,
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err: any) {
      console.error('File retrieval error:', err);
      res.status(500).send('Error reading file from server storage');
    }
  });

  // Delete file from server storage
  app.delete('/api/storage/files/:key', (req: Request, res: Response) => {
    try {
      const storageKey = req.params.key;
      const safeKey = storageKey.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(UPLOADS_DIR, safeKey);
      const metaPath = filePath + '.meta.json';

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
      }
      res.json({ success: true, message: 'Removed from server storage' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Delete failed' });
    }
  });

  // Vite Integration:
  // In development, mount Vite middleware mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`INFCLOUD real-time storage server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
