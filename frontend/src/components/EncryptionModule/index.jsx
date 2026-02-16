import React, { useContext, useEffect, useState } from 'react';
import { Loader2, Lock, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { useEncryption } from '../../hooks/useEncryption';
import { AppContext } from '../../App';

function EncryptionModule({ file, onEncrypted, encryptionKey }) {
  const { encryptFile, isEncrypting, encryptionProgress, error } = useEncryption();
  const { addNotification } = useContext(AppContext);
  const [encryptionStatus, setEncryptionStatus] = useState('idle');
  const [fileHash, setFileHash] = useState(null);
  const [encryptionResult, setEncryptionResult] = useState(null);
  const [hashCopied, setHashCopied] = useState(false);

  useEffect(() => {
    if (file) {
      setEncryptionStatus('idle');
      setFileHash(null);
      setEncryptionResult(null);
      setHashCopied(false);
    }
  }, [file]);

  const copyHash = async () => {
    if (!fileHash) return;
    try {
      await navigator.clipboard.writeText(fileHash);
      setHashCopied(true);
      addNotification('File hash copied to clipboard', 'success');
      setTimeout(() => setHashCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = fileHash;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2000);
    }
  };

  const handleEncrypt = async () => {
    if (!file || !encryptionKey) return;
    setEncryptionStatus('encrypting');
    try {
      const result = await encryptFile(file, encryptionKey);
      setFileHash(result.originalHash);
      setEncryptionResult(result);
      setEncryptionStatus('complete');
      onEncrypted?.(result);
    } catch {
      setEncryptionStatus('error');
    }
  };

  if (!file) {
    return (
      <div className="text-center py-4">
        <Lock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Select a file to encrypt</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* File info */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-950/60 border border-white/[0.06]">
        <Lock className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 truncate">{file.name}</p>
          <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        {encryptionStatus === 'complete' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
      </div>

      {!encryptionKey && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-500/5 border border-accent-500/10">
          <AlertCircle className="w-4 h-4 text-accent-500 shrink-0" />
          <span className="text-xs text-accent-400">Generate or import an encryption key first</span>
        </div>
      )}

      {/* File hash */}
      {fileHash && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Original File Hash</span>
            <button
              onClick={copyHash}
              className={`btn-ghost p-1.5 ${hashCopied ? 'text-emerald-400' : ''}`}
            >
              {hashCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-surface-950/80 border border-white/[0.06]">
            <code className="text-xs text-cyber-400 font-mono break-all">{fileHash}</code>
          </div>
          <p className="text-[10px] text-slate-500">
            Save this hash securely — you'll need it to retrieve your document later.
          </p>
        </div>
      )}

      {/* Encrypt button */}
      <button
        onClick={handleEncrypt}
        disabled={!file || !encryptionKey || isEncrypting || encryptionStatus === 'complete'}
        className={`w-full ${encryptionStatus === 'complete' ? 'btn-success' : 'btn-primary'}`}
      >
        {isEncrypting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting...</>
        ) : encryptionStatus === 'complete' ? (
          <><CheckCircle className="w-4 h-4" /> Encrypted</>
        ) : (
          <><Lock className="w-4 h-4" /> Encrypt File</>
        )}
      </button>

      {/* Progress bar */}
      {isEncrypting && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-300"
              style={{ width: `${encryptionProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right">{Math.round(encryptionProgress)}%</p>
        </div>
      )}

      {/* Result */}
      {encryptionResult && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-xs text-slate-500">Original</p>
            <p className="text-sm font-medium text-slate-200">{(encryptionResult.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-xs text-slate-500">Encrypted</p>
            <p className="text-sm font-medium text-slate-200">{(encryptionResult.encryptedSize / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
            <p className="text-xs text-slate-500">Status</p>
            <p className="text-sm font-medium text-emerald-400">Ready</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

export default EncryptionModule;
