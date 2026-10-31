import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Trash2,
  Lock,
  Clock,
  Eye,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ShareRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { revokeShareRecord } from '../../lib/database';
import { formatBytes, formatDate } from '../../lib/utils';

interface ShareManagerProps {
  shares: ShareRecord[];
}

export const ShareManager: React.FC<ShareManagerProps> = ({ shares }) => {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeShares = shares.filter((s) => !s.isRevoked);
  const revokedShares = shares.filter((s) => s.isRevoked);

  const copyShareLink = (token: string, id: string) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (share: ShareRecord) => {
    if (!user) return;
    if (confirm(`Revoke share link for "${share.fileName}"? Recipients will immediately lose access.`)) {
      await revokeShareRecord(share.id, share.fileName, user.uid);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Share2 className="w-5 h-5 text-sky-400" />
          <span>Shared Links Manager</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Monitor access logs, audit active cryptographic links, or revoke sharing immediately.
        </p>
      </div>

      {activeShares.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center">
          <Share2 className="w-12 h-12 text-zinc-600 mb-3" />
          <h4 className="text-sm font-semibold text-zinc-300">No active shared links</h4>
          <p className="text-xs text-zinc-500 mt-1">
            When you create share links or QuickDrop bundles, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeShares.map((share) => {
            const isExpired = share.expiresAt && new Date(share.expiresAt).getTime() < Date.now();

            return (
              <div
                key={share.id}
                className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2.5 rounded-xl bg-zinc-800 text-sky-400 shrink-0">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate max-w-xs md:max-w-md">
                          {share.fileName}
                        </h4>
                        {share.isPasswordProtected && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded-md">
                            <Lock className="w-3 h-3" />
                            <span>Protected</span>
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] text-red-400 bg-red-950/40 border border-red-800/40 px-1.5 py-0.5 rounded-md">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {formatBytes(share.fileSize)} · Created {formatDate(share.createdAt)} · {share.accessCount || 0} access{share.accessCount === 1 ? '' : 'es'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => copyShareLink(share.shareToken, share.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition active:scale-95"
                    >
                      {copiedId === share.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRevoke(share)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-xs font-semibold text-red-300 transition"
                      title="Revoke access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  </div>
                </div>

                {share.expiresAt && (
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-3 pt-2.5 border-t border-zinc-800/60">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires {formatDate(share.expiresAt)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {revokedShares.length > 0 && (
        <div className="pt-6 border-t border-zinc-800/80 space-y-3">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
            Revoked Links Archive ({revokedShares.length})
          </span>
          <div className="space-y-2 opacity-60">
            {revokedShares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400"
              >
                <span className="line-through">{share.fileName}</span>
                <span className="text-[10px] text-red-400">Revoked</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
