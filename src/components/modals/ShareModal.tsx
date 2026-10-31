import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Share2,
  Copy,
  Check,
  Lock,
  Calendar,
  ShieldCheck,
  Link2,
  QrCode,
  Download,
  Smartphone,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { FileItem, ShareRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createShareRecord } from '../../lib/database';
import { generateSecureToken, hashPassword, formatBytes } from '../../lib/utils';

interface ShareModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ file, onClose }) => {
  const { user } = useAuth();
  const [expiryDays, setExpiryDays] = useState<'1' | '7' | '30' | 'never'>('7');
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qr' | 'link'>('qr');
  const [copied, setCopied] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!file || !user) return null;

  const handleGenerateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (enablePassword && !password.trim()) {
      setError('Please provide a password or disable password protection.');
      return;
    }

    setLoading(true);
    try {
      const token = generateSecureToken(24);
      let passwordHash: string | undefined = undefined;

      if (enablePassword) {
        passwordHash = await hashPassword(password.trim());
      }

      let expiresAt: string | null = null;
      if (expiryDays !== 'never') {
        const days = parseInt(expiryDays, 10);
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + days);
        expiresAt = expDate.toISOString();
      }

      const shareId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newShare: ShareRecord = {
        id: shareId,
        fileId: file.id,
        ownerId: user.uid,
        ownerEmail: user.email || '',
        shareToken: token,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.mimeType,
        storageKey: file.storageKey,
        ...(file.downloadUrl ? { downloadUrl: file.downloadUrl } : {}),
        expiresAt,
        isPasswordProtected: enablePassword,
        ...(passwordHash ? { passwordHash } : {}),
        accessCount: 0,
        createdAt: new Date().toISOString(),
      };

      await createShareRecord(newShare);

      const generatedUrl = `${window.location.origin}/s/${token}`;
      setShareUrl(generatedUrl);

      // Generate High-DPI QR Code for mobile scanning
      const qrData = await QRCode.toDataURL(generatedUrl, {
        width: 480,
        margin: 2,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(qrData);
    } catch (err: any) {
      console.error('Create share error:', err);
      setError(err?.message || 'Failed to create share link.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadQrCodeImage = () => {
    if (!qrDataUrl) return;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${safeName}_INFCLOUD_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyQrImageToClipboard = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedQr(true);
        setTimeout(() => setCopiedQr(false), 2000);
        return;
      }
    } catch {
      // Fallback to text copy
    }
    copyToClipboard();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-5 sm:p-6 shadow-2xl text-zinc-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {shareUrl ? 'Share File & Mobile QR Code' : 'Create Secure Share Link'}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-[240px]">
                {file.name} · {formatBytes(file.size)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200">
            {error}
          </div>
        )}

        {shareUrl ? (
          <div className="space-y-4">
            {/* View Tab Selector: QR Code vs Link */}
            <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'qr'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Mobile QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'link'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </button>
            </div>

            {/* TAB 1: QR CODE VIEW */}
            {activeTab === 'qr' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center">
                  <div className="p-3 rounded-2xl bg-white shadow-lg shadow-black/40 border-4 border-white mb-3">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR code to access ${file.name}`}
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-zinc-400">
                        <span className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Scan Instructions */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 mb-1">
                    <Smartphone className="w-4 h-4" />
                    <span>Scan with any Mobile Camera</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 max-w-xs">
                    Point iPhone Camera or Android Google Lens to open and download "{file.name}" instantly on mobile.
                  </p>
                </div>

                {/* QR Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={downloadQrCodeImage}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700/80 text-xs font-semibold text-zinc-200 hover:text-white transition active:scale-95 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Download QR (.png)</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyQrImageToClipboard}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700/80 text-xs font-semibold text-zinc-200 hover:text-white transition active:scale-95 shadow-sm"
                  >
                    {copiedQr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                    <span>{copiedQr ? 'Image Copied!' : 'Copy QR Image'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: DIRECT LINK VIEW */}
            {activeTab === 'link' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Cryptographic Link Active</span>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 bg-transparent text-xs text-zinc-200 outline-none truncate font-mono"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition active:scale-95"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.share({
                            title: file.name,
                            text: `Access "${file.name}" securely on INFCLOUD`,
                            url: shareUrl,
                          });
                        } catch {
                          // dismissed
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-sky-400 flex items-center justify-center gap-2 transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share via Phone Apps (WhatsApp, Messages, etc.)</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Security & Expiry Metadata pill */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {expiryDays === 'never' ? 'Never expires' : `Expires in ${expiryDays} day${expiryDays === '1' ? '' : 's'}`}
                </span>
              </span>

              {enablePassword ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Lock className="w-3 h-3" />
                  <span>Password protected</span>
                </span>
              ) : (
                <span className="text-zinc-500">Public direct link</span>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition active:scale-95"
            >
              Done
            </button>
          </div>
        ) : (
          /* CONFIGURATION FORM BEFORE GENERATING LINK / QR */
          <form onSubmit={handleGenerateShare} className="space-y-4">
            {/* Expiry selection */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 mb-2">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Link & QR Expiration</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['1', '7', '30', 'never'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setExpiryDays(opt)}
                    className={`py-2 text-xs rounded-xl border font-medium transition ${
                      expiryDays === opt
                        ? 'bg-zinc-800 border-sky-500 text-white shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {opt === 'never' ? 'Never' : `${opt} Day${opt === '1' ? '' : 's'}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Password Protection */}
            <div className="pt-2 border-t border-zinc-800/80">
              <label className="flex items-center justify-between cursor-pointer mb-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Password Protection</span>
                </span>
                <input
                  type="checkbox"
                  checked={enablePassword}
                  onChange={(e) => setEnablePassword(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-sky-500 focus:ring-0"
                />
              </label>

              {enablePassword && (
                <input
                  type="password"
                  placeholder="Enter access passphrase"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-xs font-semibold text-white shadow-lg shadow-sky-950/30 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span>Generating secure link & QR code...</span>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Generate Link & Mobile QR Code</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
