import React, { useRef } from 'react';
import {
  Smartphone,
  Camera,
  Video,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  HardDrive,
  Info,
} from 'lucide-react';
import { formatBytes } from '../../lib/utils';

interface PhoneBackupProps {
  totalUsedBytes: number;
  maxQuotaBytes: number;
  onStartUpload: (files: FileList | File[]) => void;
}

export const PhoneBackup: React.FC<PhoneBackupProps> = ({
  totalUsedBytes,
  maxQuotaBytes,
  onStartUpload,
}) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onStartUpload(e.target.files);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-purple-400" />
          <span>Phone Backup Center</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Streamlined mobile media and documents synchronization for Android and desktop devices.
        </p>
      </div>

      {/* Info notice about browser PWA sync capabilities */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-200 leading-relaxed">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block mb-0.5">Android Web & PWA Architecture</strong>
          In standard browser and PWA runtimes, backups require explicit user selection of camera roll or folders due to OS sandbox privacy restrictions. Full silent background daemon sync is planned for the companion native Android client.
        </div>
      </div>

      {/* Backup Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Photos Backup */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-sky-950/50 border border-sky-800/40 flex items-center justify-center text-sky-400 mb-3 shadow-lg">
              <Camera className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Camera Roll & Photos</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Batch backup gallery snapshots, screenshots, and camera photos in original resolution.
            </p>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFiles}
            className="hidden"
          />
          <button
            onClick={() => photoInputRef.current?.click()}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Select Photos to Backup</span>
          </button>
        </div>

        {/* Video Backup */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-3 shadow-lg">
              <Video className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">High-Definition Videos</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Upload recordings and clips with resumable chunked upload support.
            </p>
          </div>
          <input
            ref={videoInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleFiles}
            className="hidden"
          />
          <button
            onClick={() => videoInputRef.current?.click()}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Select Videos to Backup</span>
          </button>
        </div>

        {/* Document Backup */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-3 shadow-lg">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Documents & Downloads</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Sync work documents, PDFs, tickets, receipts, and downloaded archives.
            </p>
          </div>
          <input
            ref={docInputRef}
            type="file"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <button
            onClick={() => docInputRef.current?.click()}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Select Documents to Backup</span>
          </button>
        </div>
      </div>

      {/* Cloud Quota Status Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>INFCLOUD Ready: <strong className="text-white">{formatBytes(maxQuotaBytes - totalUsedBytes)}</strong> remaining</span>
        </span>
        <span className="font-mono text-zinc-500">Android 14+ Compatible</span>
      </div>
    </div>
  );
};
