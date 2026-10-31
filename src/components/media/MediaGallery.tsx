import React, { useState } from 'react';
import {
  Image,
  Video,
  Play,
  Download,
  Share2,
  Eye,
  HardDrive,
} from 'lucide-react';
import { FileItem } from '../../types';
import { formatBytes, formatDate, getFileCategory } from '../../lib/utils';
import { downloadFileBlob } from '../../lib/storage';

interface MediaGalleryProps {
  files: FileItem[];
  onPreviewFile: (file: FileItem) => void;
  onShareFile: (file: FileItem) => void;
  onOpenUpload: () => void;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  files,
  onPreviewFile,
  onShareFile,
  onOpenUpload,
}) => {
  const [tab, setTab] = useState<'photos' | 'videos'>('photos');

  const mediaFiles = files.filter((f) => {
    if (f.isTrashed || f.isVault) return false;
    const cat = getFileCategory(f.mimeType, f.name);
    return tab === 'photos' ? cat === 'images' : cat === 'videos';
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {tab === 'photos' ? <Image className="w-5 h-5 text-sky-400" /> : <Video className="w-5 h-5 text-indigo-400" />}
            <span>{tab === 'photos' ? 'Photo Gallery' : 'Video Collection'}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Universal media streaming and high-resolution visual previews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setTab('photos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                tab === 'photos' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              <span>Photos</span>
            </button>
            <button
              onClick={() => setTab('videos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                tab === 'videos' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Videos</span>
            </button>
          </div>

          <button
            onClick={onOpenUpload}
            className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-md transition active:scale-95"
          >
            Upload {tab === 'photos' ? 'Photos' : 'Videos'}
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {mediaFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center">
          {tab === 'photos' ? (
            <Image className="w-12 h-12 text-zinc-600 mb-3" />
          ) : (
            <Video className="w-12 h-12 text-zinc-600 mb-3" />
          )}
          <h4 className="text-sm font-semibold text-zinc-300">
            No {tab === 'photos' ? 'photos' : 'videos'} found
          </h4>
          <p className="text-xs text-zinc-500 mt-1 mb-4">
            Upload media from your camera or library to view them here anytime.
          </p>
          <button
            onClick={onOpenUpload}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
          >
            Upload Media
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {mediaFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => onPreviewFile(file)}
              className="group relative flex flex-col rounded-2xl bg-zinc-900/70 border border-zinc-800/80 overflow-hidden cursor-pointer hover:border-zinc-700 transition shadow-lg"
            >
              {/* Media Container */}
              <div className="relative aspect-square w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                {tab === 'photos' && file.downloadUrl ? (
                  <img
                    src={file.downloadUrl}
                    alt={file.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <Video className="w-10 h-10 text-indigo-400/80" />
                    <div className="p-2 rounded-full bg-black/60 text-white backdrop-blur-md">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  </div>
                )}

                {/* Hover Quick Action Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewFile(file);
                    }}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md"
                    title="Fullscreen Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFileBlob(file.storageKey, file.downloadUrl, file.name);
                    }}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareFile(file);
                    }}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md"
                    title="Share Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-2.5 bg-zinc-900/90 border-t border-zinc-800/80">
                <span className="text-xs font-semibold text-zinc-200 truncate block" title={file.name}>
                  {file.name}
                </span>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                  <span>{formatBytes(file.size)}</span>
                  <span>{formatDate(file.updatedAt || file.createdAt).split(',')[0]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
