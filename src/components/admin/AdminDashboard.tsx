import React from 'react';
import {
  ShieldAlert,
  HardDrive,
  Users,
  FileCheck,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { FileItem, UserProfile, ActivityLogItem } from '../../types';
import { formatBytes, formatDate } from '../../lib/utils';

interface AdminDashboardProps {
  files: FileItem[];
  profile: UserProfile | null;
  activityLogs: ActivityLogItem[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  files,
  profile,
  activityLogs,
}) => {
  const totalSystemBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalSystemFiles = files.length;
  const trashedCount = files.filter((f) => f.isTrashed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-yellow-400" />
            <span>Master Administration Console</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Server-verified administrative telemetry and platform storage health for operator <strong className="text-yellow-400">{profile?.email}</strong>.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 font-semibold">Total Stored Payload</span>
            <HardDrive className="w-4 h-4 text-sky-400" />
          </div>
          <h3 className="text-2xl font-black text-white">{formatBytes(totalSystemBytes)}</h3>
          <span className="text-[11px] text-zinc-500 mt-1 block">Across dual cloud & resilient store</span>
        </div>

        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 font-semibold">Total Objects Tracked</span>
            <FileCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-white">{totalSystemFiles} Files</h3>
          <span className="text-[11px] text-zinc-500 mt-1 block">{trashedCount} currently in soft trash</span>
        </div>

        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 font-semibold">Security System State</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-emerald-400">ABAC Active</h3>
          <span className="text-[11px] text-zinc-500 mt-1 block">Eight Pillars Hardened Firestore Rules</span>
        </div>
      </div>

      {/* Live Activity Stream */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span>Real-Time System Activity Log</span>
        </h3>

        {activityLogs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center text-xs text-zinc-500">
            No administrative events recorded yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60 overflow-hidden">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3.5 text-xs hover:bg-zinc-850/60 transition"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                    log.action === 'upload' ? 'bg-sky-950 text-sky-400 border border-sky-800/50' :
                    log.action === 'delete' ? 'bg-red-950 text-red-400 border border-red-800/50' :
                    log.action === 'share' ? 'bg-amber-950 text-amber-400 border border-amber-800/50' :
                    log.action === 'vault' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' :
                    'bg-zinc-800 text-zinc-300'
                  }`}>
                    {log.action}
                  </span>
                  <span className="font-semibold text-zinc-200 truncate max-w-xs md:max-w-md">
                    {log.targetName}
                  </span>
                  {log.details && (
                    <span className="text-zinc-500 hidden sm:inline truncate max-w-xs">
                      ({log.details})
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-zinc-500 shrink-0">
                  {formatDate(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
