import React, { useState } from 'react';
import {
  ArrowUpDown,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Trash2,
  Wifi,
  Server,
  Zap,
  Clock,
  Pause,
  Play,
  FolderInput,
  ShieldAlert,
} from 'lucide-react';
import { TransferItem } from '../../types';
import { formatBytes, formatDate } from '../../lib/utils';

interface TransferCenterProps {
  transfers: TransferItem[];
  onCancelTransfer: (id: string) => void;
  onClearHistory: () => void;
  onRetryTransfer?: (item: TransferItem) => void;
  onPauseTransfer?: (id: string) => void;
  onResumeTransfer?: (id: string, reselectedFile?: File) => void;
  onPauseAll?: () => void;
  onResumeAll?: () => void;
  wifiOnly?: boolean;
  onToggleWifiOnly?: () => void;
}

export const TransferCenter: React.FC<TransferCenterProps> = ({
  transfers,
  onCancelTransfer,
  onClearHistory,
  onRetryTransfer,
  onPauseTransfer,
  onResumeTransfer,
  onPauseAll,
  onResumeAll,
  wifiOnly,
  onToggleWifiOnly,
}) => {
  const [filter, setFilter] = useState<'all' | 'uploading' | 'paused' | 'pending' | 'completed' | 'error'>('all');
  const [reselectTargetId, setReselectTargetId] = useState<string | null>(null);

  const filtered = transfers.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'uploading') return t.status === 'uploading';
    if (filter === 'paused') return t.status === 'paused';
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'error') return t.status === 'error';
    return true;
  });

  const activeCount = transfers.filter((t) => t.status === 'uploading').length;
  const pausedCount = transfers.filter((t) => t.status === 'paused').length;
  const waitingCount = transfers.filter((t) => t.status === 'pending').length;
  const completedCount = transfers.filter((t) => t.status === 'completed').length;
  const failedCount = transfers.filter((t) => t.status === 'error').length;

  // Total transferred bytes across session
  const totalTransferredBytes = transfers.reduce((acc, t) => acc + (t.bytesTransferred || 0), 0);
  const totalTransferredMB = (totalTransferredBytes / (1024 * 1024)).toFixed(2);

  const handleFileReselected = (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    if (e.target.files && e.target.files[0] && onResumeTransfer) {
      onResumeTransfer(taskId, e.target.files[0]);
      setReselectTargetId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Session Network Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-sky-400" />
            <span>Transfer Center</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time tracking of active uploads, verified server storage transfers, and persistent queue state.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">Total Transferred:</span>
            <strong className="text-white font-mono">{totalTransferredMB} MB (TMB)</strong>
          </div>

          {onToggleWifiOnly && (
            <button
              onClick={onToggleWifiOnly}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                wifiOnly
                  ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="When enabled, uploads only run when connected to Wi-Fi"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>{wifiOnly ? 'Wi-Fi Only: ON' : 'Wi-Fi Only: OFF'}</span>
            </button>
          )}

          {activeCount > 0 && onPauseAll && (
            <button
              onClick={onPauseAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-amber-300 hover:bg-zinc-800 transition"
              title="Pause all currently active uploads"
            >
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>Pause All</span>
            </button>
          )}

          {pausedCount > 0 && onResumeAll && (
            <button
              onClick={onResumeAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-zinc-800 transition"
              title="Resume all paused uploads"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Resume All</span>
            </button>
          )}

          {transfers.length > 0 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Clear Finished</span>
            </button>
          )}
        </div>
      </div>

      {/* Persistent Queue Notice Banner */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
        <Server className="w-4 h-4 text-sky-400 shrink-0" />
        <div className="flex-1">
          <strong className="text-white font-medium">Persistent Resumable Queue:</strong> Uploads are saved in IndexedDB. You can pause any transfer, close the browser, and resume it days later from the last recorded byte offset.
        </div>
      </div>

      {/* Filter Segmented Controls */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
            filter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All ({transfers.length})
        </button>
        <button
          onClick={() => setFilter('uploading')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
            filter === 'uploading' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('paused')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
            filter === 'paused' ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Paused ({pausedCount})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
            filter === 'pending' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Waiting ({waitingCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
            filter === 'completed' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Completed ({completedCount})
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
            filter === 'error' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Failed ({failedCount})
        </button>
      </div>

      {/* Transfers List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center">
          <ArrowUpDown className="w-10 h-10 text-zinc-600 mb-3" />
          <h4 className="text-sm font-semibold text-zinc-300">No transfers found</h4>
          <p className="text-xs text-zinc-500 mt-1">
            Active, paused, and completed file uploads will stream here with real transferred MB (TMB) and speed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition space-y-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      item.status === 'paused'
                        ? 'bg-amber-950/60 text-amber-400'
                        : item.status === 'completed'
                        ? 'bg-emerald-950/60 text-emerald-400'
                        : item.status === 'error'
                        ? 'bg-red-950/60 text-red-400'
                        : 'bg-zinc-800 text-sky-400'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs md:text-sm font-semibold text-white truncate max-w-xs md:max-w-md">
                      {item.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                      <span>Size: {formatBytes(item.size)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-zinc-300">
                        <Server className="w-3 h-3 text-sky-400" />
                        <span>{item.serverNode || 'INFCLOUD Storage Node'}</span>
                      </span>
                      {item.isVault && (
                        <>
                          <span>·</span>
                          <span className="text-amber-400 font-semibold">Private Vault</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {(item.status === 'uploading' || (item.status as any) === 'retrying') && (
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-bold">
                        {(item.status as any) === 'retrying' ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span className="text-amber-400 font-semibold">{item.speed || 'Retrying...'}</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-sky-400" />
                            <span className="text-sky-400">{item.speed || `${item.progress}%`}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono block">
                        {item.tmbFormatted || `${formatBytes(item.bytesTransferred)} of ${formatBytes(item.size)}`}
                      </span>
                    </div>
                  )}

                  {item.status === 'paused' && (
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-md bg-amber-950/70 text-amber-300 text-xs font-semibold border border-amber-800/60">
                        Paused
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                        {formatBytes(item.bytesTransferred)} saved
                      </span>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Committed</span>
                    </div>
                  )}

                  {/* Pause Button for active/retrying uploads */}
                  {(item.status === 'uploading' || (item.status as any) === 'retrying') && onPauseTransfer && (
                    <button
                      onClick={() => onPauseTransfer(item.id)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-950 text-zinc-300 hover:text-amber-400 transition"
                      title="Pause Upload"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  )}

                  {/* Resume Button for paused uploads */}
                  {item.status === 'paused' && onResumeTransfer && (
                    <>
                      {item.needsReselect ? (
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer transition shadow-md shadow-sky-950/40 active:scale-95">
                          <FolderInput className="w-3.5 h-3.5" />
                          <span>Reselect to Resume</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileReselected(e, item.id)}
                          />
                        </label>
                      ) : (
                        <button
                          onClick={() => onResumeTransfer(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40 active:scale-95"
                          title="Resume Upload"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume</span>
                        </button>
                      )}
                    </>
                  )}

                  {item.status === 'error' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400 font-medium">Failed</span>
                      {onRetryTransfer && (
                        <button
                          onClick={() => onRetryTransfer(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold transition active:scale-95"
                          title="Retry / Resume Upload"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                          <span>Resume</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cancel / Remove Button */}
                  {(item.status === 'uploading' || item.status === 'paused' || item.status === 'pending') && (
                    <button
                      onClick={() => onCancelTransfer(item.id)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 transition"
                      title="Cancel Upload"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    item.status === 'completed'
                      ? 'bg-emerald-400'
                      : item.status === 'error'
                      ? 'bg-red-500'
                      : item.status === 'paused' || (item.status as any) === 'retrying'
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              {/* Real-time TMB, Network, and ETA Badges */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Wifi className="w-3 h-3 text-sky-400" />
                    <span>{item.networkType || 'Network / Wi-Fi'}</span>
                  </span>
                  {(item.status === 'uploading' || item.status === 'paused') && (
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-sky-300 font-mono text-[10px]">
                      TMB: {item.tmbFormatted || `${(item.bytesTransferred / (1024 * 1024)).toFixed(2)} MB`}
                    </span>
                  )}
                  {item.status === 'paused' && (
                    <span className="text-amber-400 text-[10px] flex items-center gap-1">
                      <span>Saved in persistent queue</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {item.etaFormatted && item.status === 'uploading' && (
                    <span className="flex items-center gap-1 text-zinc-400 font-mono text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>{item.etaFormatted}</span>
                    </span>
                  )}
                  <span className="font-mono font-medium text-white">
                    {item.progress}%
                  </span>
                </div>
              </div>

              {item.error && (
                <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{item.error}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
