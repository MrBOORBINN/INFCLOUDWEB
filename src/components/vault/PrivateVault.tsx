import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  KeyRound,
  Eye,
  Download,
  Trash2,
  Upload,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { FileItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatBytes, formatDate, hashPassword } from '../../lib/utils';
import { downloadFileBlob } from '../../lib/storage';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface PrivateVaultProps {
  files: FileItem[];
  onPreviewFile: (file: FileItem) => void;
  onRemoveFromVault: (file: FileItem) => void;
  onOpenUpload: (isVault?: boolean) => void;
}

export const PrivateVault: React.FC<PrivateVaultProps> = ({
  files,
  onPreviewFile,
  onRemoveFromVault,
  onOpenUpload,
}) => {
  const { user, profile } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Auto-lock timer: 5 minutes of inactivity
  useEffect(() => {
    if (!isUnlocked) return;
    const timer = setTimeout(() => {
      setIsUnlocked(false);
      setPinInput('');
    }, 5 * 60 * 1000);

    return () => clearTimeout(timer);
  }, [isUnlocked]);

  const vaultFiles = files.filter((f) => f.isVault && !f.isTrashed);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (!profile?.vaultPinHash) {
      // Prompt user to set a PIN
      setIsSettingPin(true);
      return;
    }

    try {
      const hashed = await hashPassword(pinInput.trim());
      if (hashed === profile.vaultPinHash) {
        setIsUnlocked(true);
        setPinInput('');
      } else {
        setPinError('Incorrect Vault PIN. Access denied.');
      }
    } catch {
      setPinError('Failed to verify PIN.');
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('PINs do not match.');
      return;
    }

    if (!user) return;

    try {
      const hashed = await hashPassword(newPin.trim());
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        vaultPinHash: hashed,
        updatedAt: new Date().toISOString(),
      });
      setIsSettingPin(false);
      setIsUnlocked(true);
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      setPinError(err?.message || 'Failed to update Vault PIN.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span>Private Vault</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Zero-leakage isolated compartment for confidential documents with hardware-level security PIN.
          </p>
        </div>

        {isUnlocked && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenUpload(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md transition active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Add to Vault</span>
            </button>
            <button
              onClick={() => {
                setIsUnlocked(false);
                setPinInput('');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition"
            >
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Lock Vault</span>
            </button>
          </div>
        )}
      </div>

      {!isUnlocked ? (
        /* VAULT LOCKED STATE */
        <div className="flex flex-col items-center justify-center p-8 md:p-14 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-2xl max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1">
            {profile?.vaultPinHash ? 'Vault is Locked' : 'Set Up Private Vault'}
          </h3>
          <p className="text-xs text-zinc-400 mb-6">
            {profile?.vaultPinHash
              ? 'Enter your confidential PIN to decrypt and access your secured files.'
              : 'Create a private 4-8 digit security PIN to protect sensitive documents.'}
          </p>

          {pinError && (
            <div className="w-full p-3 mb-4 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200">
              {pinError}
            </div>
          )}

          {isSettingPin || !profile?.vaultPinHash ? (
            /* PIN Setup Form */
            <form onSubmit={handleSavePin} className="w-full space-y-3">
              <input
                type="password"
                required
                maxLength={8}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New 4-8 Digit PIN"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition text-center tracking-widest font-mono"
              />
              <input
                type="password"
                required
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm Security PIN"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition text-center tracking-widest font-mono"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg transition active:scale-95"
              >
                Save PIN & Open Vault
              </button>
            </form>
          ) : (
            /* PIN Unlock Form */
            <form onSubmit={handleUnlock} className="w-full space-y-4">
              <input
                type="password"
                required
                autoFocus
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3.5 px-4 text-xl text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition text-center tracking-[0.5em] font-mono"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg transition active:scale-95"
              >
                Unlock Vault
              </button>
              <button
                type="button"
                onClick={() => setIsSettingPin(true)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 transition"
              >
                Reset PIN with master credentials
              </button>
            </form>
          )}

          <div className="flex items-center gap-2 mt-6 text-[11px] text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Automatic lock on 5 minutes inactivity</span>
          </div>
        </div>
      ) : (
        /* VAULT UNLOCKED FILE LIST */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Session Authenticated — Isolated files active</span>
            </div>
            <span className="font-semibold">{vaultFiles.length} Secured Objects</span>
          </div>

          {vaultFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center">
              <Lock className="w-12 h-12 text-zinc-600 mb-3" />
              <h4 className="text-sm font-semibold text-zinc-300">Your Private Vault is empty</h4>
              <p className="text-xs text-zinc-500 mt-1 mb-4">
                Add contracts, tax returns, passwords, or keys to keep them strictly isolated.
              </p>
              <button
                onClick={() => onOpenUpload(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg transition active:scale-95"
              >
                Upload to Vault
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {vaultFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onPreviewFile(file)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-emerald-600/60 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-semibold text-zinc-200 hover:text-white truncate block">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {formatBytes(file.size)} · {formatDate(file.updatedAt || file.createdAt).split(',')[0]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => downloadFileBlob(file.storageKey, file.downloadUrl, file.name)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemoveFromVault(file)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400"
                      title="Remove from Vault"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
