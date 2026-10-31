import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Pause,
  Play,
  RotateCcw,
  FolderInput,
} from 'lucide-react';
import { TransferItem } from '../../types';
import { formatBytes } from '../../lib/utils';

interface UploadWidgetProps {
  transfers: TransferItem[];
  onCancelTransfer: (id: string) => void;
  onClearCompleted: () => void;
  onPauseTransfer?: (id: string) => void;
  onResumeTransfer?: (id: string, reselectedFile?: File) => void;
  onResumeAll?: () => void;
}

export const UploadWidget: React.FC<UploadWidgetProps> = ({
  transfers,
  onCancelTransfer,
  onClearCompleted,
  onPauseTransfer,
  onResumeTransfer,
  onResumeAll,
}) => {
  const [minimized, setMinimized] = useState(false);

  const activeTransfers = transfers.filter(
    (t) => t.status === 'uploading' || (t.status as any) === 'retrying' || t.status === 'pending'
  );
  const pausedTransfers = transfers.filter((t) => t.status === 'paused');

  if (transfers.length === 0) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 right-3 md:right-6 z-40 w-[calc(100vw-24px)] md:w-96 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-xl ring-1 ring-white/10">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">
            {activeTransfers.length > 0
              ? `Uploading ${activeTransfers.length} item${activeTransfers.length > 1 ? 's' : ''}`
              : pausedTransfers.length > 0
              ? `${pausedTransfers.length} item${pausedTransfers.length > 1 ? 's' : ''} Paused`
              : 'Transfers Completed'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Resume All Button in Header */}
          {pausedTransfers.length > 0 && onResumeAll && (
            <button
              onClick={onResumeAll}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold transition active:scale-95"
              title="Resume all paused uploads"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Resume All</span>
            </button>
          )}

          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClearCompleted}
            className="p-1 rounded-lg text-zinc-400 hover:text-white"
            title="Dismiss completed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: transfers list */}
      {!minimized && (
        <div className="max-h-64 overflow-y-auto p-2 space-y-2">
          {transfers.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-zinc-200 truncate max-w-[160px]" title={item.name}>
                  {item.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status === 'uploading' && (
                    <span className="text-[10px] text-sky-400 font-mono">
                      {item.speed || `${item.progress}%`}
                    </span>
                  )}
                  {(item.status as any) === 'retrying' && (
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 animate-pulse">
                      <RotateCcw className="w-2.5 h-2.5 animate-spin" />
                      <span>Retrying</span>
                    </span>
                  )}
                  {item.status === 'paused' && (
                    <span className="text-[10px] text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-950/80">
                      Paused
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  )}

                  {/* Pause Button */}
                  {(item.status === 'uploading' || (item.status as any) === 'retrying') && onPauseTransfer && (
                    <button
                      onClick={() => onPauseTransfer(item.id)}
                      className="p-1 rounded-md bg-zinc-800 hover:bg-amber-950/80 text-zinc-300 hover:text-amber-400 transition"
                      title="Pause Upload"
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                  )}

                  {/* PROMINENT RESUME BUTTON FOR PAUSED UPLOADS */}
                  {item.status === 'paused' && onResumeTransfer && (
                    <>
                      {item.needsReselect ? (
                        <label className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer transition active:scale-95 shadow-sm" title="Reselect file to resume upload">
                          <FolderInput className="w-2.5 h-2.5" />
                          <span>Resume</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                onResumeTransfer(item.id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <button
                          onClick={() => onResumeTransfer(item.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition active:scale-95 shadow-sm shadow-emerald-950/40"
                          title="Resume Upload"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Resume</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Retry / Resume on failed uploads */}
                  {item.status === 'error' && onResumeTransfer && (
                    <button
                      onClick={() => onResumeTransfer(item.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold transition active:scale-95"
                      title="Retry / Resume Upload"
                    >
                      <RotateCcw className="w-2.5 h-2.5 text-sky-400" />
                      <span>Resume</span>
                    </button>
                  )}

                  {/* Cancel Button */}
                  {(item.status === 'uploading' || (item.status as any) === 'retrying' || item.status === 'paused' || item.status === 'pending' || item.status === 'error') && (
                    <button
                      onClick={() => onCancelTransfer(item.id)}
                      className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
                      title="Cancel Upload"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    item.status === 'completed'
                      ? 'bg-emerald-400'
                      : item.status === 'error'
                      ? 'bg-red-500'
                      : item.status === 'paused' || (item.status as any) === 'retrying'
                      ? 'bg-amber-400'
                      : 'bg-sky-400'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1 font-mono">
                <span>
                  {item.status === 'paused'
                    ? `Paused (${item.progress}%)`
                    : item.tmbFormatted || `${formatBytes(item.bytesTransferred)} of ${formatBytes(item.size)}`}
                </span>
                <span>{item.networkType || 'Network'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
