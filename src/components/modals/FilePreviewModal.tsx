import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Music,
  Video as VideoIcon,
  HardDrive,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Table,
  FileSpreadsheet,
  Eye,
  FileCode,
  FileCheck,
} from 'lucide-react';
import { FileItem, PackageItemFile } from '../../types';
import { formatBytes, formatDate, getFileCategory } from '../../lib/utils';
import { downloadFileBlob, getIDBObject, getStorageUrl } from '../../lib/storage';

export type PreviewableFile = FileItem | PackageItemFile;

interface FilePreviewModalProps {
  file: PreviewableFile | null;
  fileList?: PreviewableFile[];
  onClose: () => void;
  onShare?: (file: FileItem) => void;
  onSelectFile?: (file: PreviewableFile) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  fileList = [],
  onClose,
  onShare,
  onSelectFile,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Current file index in fileList for navigation
  const currentIndex = useMemo(() => {
    if (!file || !fileList.length) return -1;
    return fileList.findIndex((f) => (f as any).id === (file as any).id || f.storageKey === file.storageKey || f.name === file.name);
  }, [file, fileList]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < fileList.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectFile) {
      onSelectFile(fileList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectFile) {
      onSelectFile(fileList[currentIndex + 1]);
    }
  };

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && hasNext) {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, currentIndex]);

  useEffect(() => {
    if (!file) {
      setBlobUrl(null);
      setTextContent(null);
      setCsvRows(null);
      setLoadError(null);
      return;
    }

    setZoom(1);
    setRotation(0);
    setLoadingContent(true);
    setLoadError(null);
    setTextContent(null);
    setCsvRows(null);

    let objectUrlToRevoke: string | null = null;
    let isSubscribed = true;

    const loadPayload = async () => {
      try {
        let blob: Blob | null = null;

        // 1. Try IndexedDB cache
        try {
          blob = await getIDBObject(file.storageKey);
        } catch {
          // continue
        }

        // 2. Fetch via downloadUrl or resolve storage URL
        if (!blob) {
          let urlToFetch = file.downloadUrl;
          if (!urlToFetch) {
            urlToFetch = (await getStorageUrl(file.storageKey)) || undefined;
          }

          if (urlToFetch) {
            try {
              const resp = await fetch(urlToFetch);
              if (resp.ok) {
                blob = await resp.blob();
              }
            } catch (fetchErr) {
              console.warn('Direct blob fetch notice:', fetchErr);
              // Fallback to url directly
              if (isSubscribed) {
                setBlobUrl(urlToFetch);
              }
            }
          }
        }

        if (!isSubscribed) return;

        if (blob) {
          const url = URL.createObjectURL(blob);
          objectUrlToRevoke = url;
          setBlobUrl(url);

          const lowerName = file.name.toLowerCase();
          const isCsv = lowerName.endsWith('.csv') || file.mimeType.includes('csv');
          const isTextLike =
            file.mimeType.includes('text') ||
            file.mimeType.includes('json') ||
            file.mimeType.includes('xml') ||
            file.mimeType.includes('javascript') ||
            file.mimeType.includes('typescript') ||
            [
              'txt', 'md', 'json', 'csv', 'xml', 'js', 'jsx', 'ts', 'tsx',
              'html', 'htm', 'css', 'scss', 'py', 'java', 'c', 'cpp', 'h',
              'sh', 'bash', 'yaml', 'yml', 'sql', 'env', 'log', 'ini', 'toml',
            ].some((ext) => lowerName.endsWith(`.${ext}`));

          if (isCsv) {
            const text = await blob.text();
            setTextContent(text);
            // Parse top 100 rows for spreadsheet table preview
            const rows = text
              .split(/\r?\n/)
              .filter((r) => r.trim().length > 0)
              .slice(0, 100)
              .map((row) => row.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
            setCsvRows(rows);
          } else if (isTextLike) {
            const text = await blob.text();
            setTextContent(text);
          }
        }
      } catch (err: any) {
        console.warn('File preview load notice:', err);
        if (isSubscribed) {
          setLoadError(err?.message || 'Failed to load preview');
        }
      } finally {
        if (isSubscribed) {
          setLoadingContent(false);
        }
      }
    };

    loadPayload();

    return () => {
      isSubscribed = false;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [file]);

  if (!file) return null;

  const category = getFileCategory(file.mimeType, file.name);
  const lowerName = file.name.toLowerCase();
  const isPdf = lowerName.endsWith('.pdf') || file.mimeType.includes('pdf');
  const isOfficeDoc =
    ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].some((ext) => lowerName.endsWith(`.${ext}`)) ||
    file.mimeType.includes('word') ||
    file.mimeType.includes('sheet') ||
    file.mimeType.includes('presentation') ||
    file.mimeType.includes('officedocument');

  const handleDownload = () => {
    downloadFileBlob(file.storageKey, blobUrl || file.downloadUrl, file.name);
  };

  const copyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className={`relative flex flex-col w-full bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'fixed inset-0 rounded-none h-full max-h-none z-50'
            : 'max-w-6xl h-full max-h-[92vh] rounded-3xl'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-zinc-800/90 bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="p-2 rounded-xl bg-zinc-800 text-sky-400 shrink-0 border border-zinc-700/60">
              {category === 'images' && <Eye className="w-4 h-4" />}
              {category === 'videos' && <VideoIcon className="w-4 h-4" />}
              {category === 'audio' && <Music className="w-4 h-4" />}
              {category === 'documents' && (isPdf ? <FileText className="w-4 h-4 text-red-400" /> : <FileText className="w-4 h-4 text-sky-400" />)}
              {isOfficeDoc && <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
              {category !== 'images' && category !== 'videos' && category !== 'audio' && category !== 'documents' && !isOfficeDoc && (
                <HardDrive className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                  {file.name}
                </h3>
                {(file as any).path && (file as any).path !== file.name && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 font-mono">
                    {(file as any).path}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {formatBytes(file.size)} · {file.mimeType || 'Standard File'}
                {(file as any).updatedAt ? ` · ${formatDate((file as any).updatedAt)}` : ''}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-3">
            {/* Prev / Next navigation */}
            {fileList.length > 1 && (
              <div className="flex items-center gap-1 bg-zinc-800/80 rounded-xl p-1 border border-zinc-700/60 mr-1">
                <button
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition"
                  title="Previous file (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-zinc-400 px-1">
                  {currentIndex + 1}/{fileList.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition"
                  title="Next file (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Image zoom & rotate controls */}
            {category === 'images' && (
              <div className="hidden sm:flex items-center gap-1 bg-zinc-800/80 rounded-xl p-1 border border-zinc-700/60 mr-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="text-[11px] font-mono text-zinc-300 px-1 hover:text-white"
                  title="Reset Zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white ml-0.5 transition"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition border border-zinc-700/60"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Optional Share button for FileItem */}
            {onShare && (file as any).ownerId && (
              <button
                onClick={() => onShare(file as FileItem)}
                className="hidden sm:flex p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition border border-zinc-700/60"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition active:scale-95 shadow-md shadow-sky-950/40"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition border border-zinc-700/60 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 md:p-6 bg-zinc-950/90 relative">
          {loadingContent ? (
            <div className="flex flex-col items-center gap-3">
              <span className="w-8 h-8 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 font-medium">Loading authentic preview payload...</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 max-w-md w-full">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <HardDrive className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-1.5">Direct Stream Preview Unavailable</h4>
              <p className="text-xs text-zinc-400 mb-5">
                The file content could not be previewed directly in the browser sandbox. You can download the complete authentic file.
              </p>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition shadow-lg active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download File ({formatBytes(file.size)})</span>
              </button>
            </div>
          ) : (
            <>
              {/* 1. IMAGE VIEWER */}
              {category === 'images' && blobUrl && (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-2 select-none">
                  <img
                    src={blobUrl}
                    alt={file.name}
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.15s ease-out',
                      maxHeight: isFullscreen ? '94vh' : '80vh',
                    }}
                    className="max-w-full object-contain rounded-xl shadow-2xl border border-zinc-800/60"
                  />
                </div>
              )}

              {/* 2. VIDEO PLAYER */}
              {category === 'videos' && blobUrl && (
                <div className="w-full max-w-5xl max-h-full flex items-center justify-center">
                  <video
                    src={blobUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full max-h-[78vh] rounded-2xl shadow-2xl bg-black border border-zinc-800"
                  >
                    Your browser does not support HTML5 video preview.
                  </video>
                </div>
              )}

              {/* 3. AUDIO PLAYER */}
              {category === 'audio' && blobUrl && (
                <div className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl max-w-lg w-full">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-500/20 to-blue-600/10 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-xl">
                    <Music className="w-10 h-10 animate-pulse" />
                  </div>
                  <div className="text-center w-full">
                    <h4 className="text-base font-bold text-white mb-1 truncate">{file.name}</h4>
                    <p className="text-xs text-zinc-400 font-mono">{formatBytes(file.size)}</p>
                  </div>
                  <audio src={blobUrl} controls autoPlay className="w-full mt-2" />
                </div>
              )}

              {/* 4. CSV TABLE SPREADSHEET PREVIEW */}
              {csvRows && csvRows.length > 0 && (
                <div className="w-full h-full flex flex-col bg-zinc-900/95 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-400 shrink-0">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-zinc-200">Spreadsheet Grid Preview</span>
                      <span className="text-[11px] text-zinc-500">
                        ({csvRows.length} rows previewed)
                      </span>
                    </div>
                    <button
                      onClick={copyText}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition text-[11px]"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy CSV'}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto p-2">
                    <table className="w-full text-left text-xs font-mono text-zinc-300 border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-700 bg-zinc-800/60 sticky top-0">
                          {csvRows[0].map((header, hIdx) => (
                            <th key={hIdx} className="px-3 py-2 font-semibold text-white truncate max-w-[200px]">
                              {header || `Col ${hIdx + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/80">
                        {csvRows.slice(1).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-zinc-800/40">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 truncate max-w-[220px]">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. TEXT / CODE / MARKDOWN PREVIEW */}
              {textContent !== null && !csvRows && (
                <div className="w-full h-full flex flex-col bg-zinc-900/95 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-400 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                        <Code2 className="w-4 h-4" />
                        <span>Source Content Viewer</span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {textContent.split('\n').length} lines
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setWordWrap(!wordWrap)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition ${
                          wordWrap ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Wrap
                      </button>
                      <button
                        onClick={copyText}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition text-[11px]"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4 font-mono text-xs text-zinc-200 leading-relaxed bg-[#0d1117] select-text">
                    <pre className={`${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
                      {textContent}
                    </pre>
                  </div>
                </div>
              )}

              {/* 6. PDF VIEWER */}
              {isPdf && blobUrl && textContent === null && (
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-900 flex flex-col">
                  <iframe
                    src={`${blobUrl}#toolbar=1&navpanes=1`}
                    title={file.name}
                    className="w-full flex-1 border-0 rounded-2xl"
                  />
                </div>
              )}

              {/* 7. OFFICE DOCUMENT VIEWER (DOCX, PPTX, XLSX) */}
              {isOfficeDoc && textContent === null && !csvRows && (
                <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl max-w-lg w-full">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg">
                    <FileSpreadsheet className="w-10 h-10" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1.5">{file.name}</h4>
                  <p className="text-xs text-zinc-400 mb-4 max-w-sm">
                    Structured Office document ({file.name.split('.').pop()?.toUpperCase() || 'Doc'}) ready for high-speed download or native opening.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    {file.downloadUrl && (
                      <a
                        href={`https://docs.google.com/viewer?url=${encodeURIComponent(file.downloadUrl)}&embedded=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition border border-zinc-700/60"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Online Web Viewer</span>
                      </a>
                    )}
                    <button
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition shadow-lg active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 8. BINARY / ARCHIVE / UNKNOWN FALLBACK */}
              {!isPdf && !isOfficeDoc && category !== 'images' && category !== 'videos' && category !== 'audio' && textContent === null && !csvRows && (
                <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl max-w-md w-full">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 mb-4 shadow-lg">
                    <HardDrive className="w-10 h-10 text-sky-400" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1.5 truncate max-w-xs">{file.name}</h4>
                  <p className="text-xs text-zinc-400 mb-4">
                    In-browser interactive preview is not available for binary <strong className="text-zinc-200 font-mono">{file.mimeType || 'binary format'}</strong>. The authentic file payload is preserved in high-capacity storage.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition shadow-lg active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original ({formatBytes(file.size)})</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
