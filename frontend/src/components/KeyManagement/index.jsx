import React, { useState, useEffect, useContext, useRef } from 'react';
import { Key, Eye, EyeOff, Copy, Download, Upload, AlertCircle, Check, RefreshCw } from 'lucide-react';
import CryptoUtils from '../../utils/crypto';
import { AppContext } from '../../App';

function KeyManagement({ onKeyGenerated }) {
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [keyString, setKeyString] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const { addNotification } = useContext(AppContext);
  const hasLoadedKey = useRef(false);

  useEffect(() => {
    if (!hasLoadedKey.current) {
      hasLoadedKey.current = true;
      loadStoredKey();
    }
  }, []);

  useEffect(() => {
    if (encryptionKey) {
      CryptoUtils.exportKey(encryptionKey)
        .then(exported => {
          setKeyString(exported);
          if (onKeyGenerated) onKeyGenerated(encryptionKey);
        })
        .catch(err => console.error('Failed to export key:', err));
    }
  }, [encryptionKey, onKeyGenerated]);

  const loadStoredKey = async () => {
    try {
      const keyData = await CryptoUtils.getKeyFromDB('current');
      if (keyData && keyData.key) setEncryptionKey(keyData.key);
    } catch { console.log('No stored key found'); }
  };

  const generateKey = async () => {
    setIsGenerating(true);
    setImportError('');
    try {
      const key = await CryptoUtils.generateKey();
      setEncryptionKey(key);
      const metadata = { accessLevel: 'owner', userId: 'current_user', expirationTime: 0, createdAt: Date.now() };
      await CryptoUtils.storeKeyInDB('current', key, metadata);
      await CryptoUtils.storeKeyInDB(`key_${Date.now()}`, key, metadata);
      addNotification('Encryption key generated successfully', 'success');
    } catch (error) {
      console.error('Key generation error:', error);
      setImportError('Failed to generate key');
      addNotification('Failed to generate key', 'error');
    } finally { setIsGenerating(false); }
  };

  const copyKey = () => {
    if (keyString) {
      navigator.clipboard.writeText(keyString).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  };

  const downloadKey = () => {
    if (keyString) {
      const blob = new Blob([keyString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `encryption-key-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const importKey = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImportError('');
    try {
      const hexKey = await file.text();
      const key = await CryptoUtils.importKey(hexKey.trim());
      setEncryptionKey(key);
      const metadata = { accessLevel: 'owner', userId: 'current_user', expirationTime: 0, createdAt: Date.now() };
      await CryptoUtils.storeKeyInDB('current', key, metadata);
      event.target.value = '';
      addNotification('Key imported successfully', 'success');
    } catch (error) {
      console.error('Key import error:', error);
      setImportError(error.message);
      addNotification('Failed to import key: ' + error.message, 'error');
    }
  };

  if (!encryptionKey) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
            <Key className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-sm text-slate-300 font-medium">No encryption key found</p>
          <p className="text-xs text-slate-500 mt-1">Generate a new key or import an existing one</p>
        </div>

        <div className="flex gap-3">
          <button onClick={generateKey} disabled={isGenerating} className="btn-primary flex-1">
            {isGenerating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Key className="w-4 h-4" /> Generate Key</>
            )}
          </button>
          <label className="btn-secondary flex-1 cursor-pointer">
            <Upload className="w-4 h-4" /> Import Key
            <input type="file" onChange={importKey} accept=".txt" className="hidden" />
          </label>
        </div>

        {importError && (
          <p className="text-xs text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {importError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Your Encryption Key</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowKey(!showKey)} className="btn-ghost p-1.5" title={showKey ? 'Hide key' : 'Show key'}>
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={copyKey} className="btn-ghost p-1.5" title="Copy key">
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={downloadKey} className="btn-ghost p-1.5" title="Download key">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 rounded-lg bg-surface-950/80 border border-white/[0.06] font-mono text-xs break-all">
          {showKey ? (
            <span className="text-accent-400">{keyString}</span>
          ) : (
            <span className="text-slate-600 select-none">{'*'.repeat(64)}</span>
          )}
        </div>

        {copySuccess && (
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Copied to clipboard
          </p>
        )}
      </div>

      {/* Warning */}
      <div className="flex gap-3 p-3 rounded-lg bg-accent-500/5 border border-accent-500/10">
        <AlertCircle className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400">
          <p className="font-medium text-accent-400">Save this key securely</p>
          <p className="mt-0.5">You'll need it to decrypt your files. Lost keys cannot be recovered.</p>
        </div>
      </div>

      {/* Secondary actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={generateKey} className="btn-ghost text-xs">
          <RefreshCw className="w-3 h-3" /> New key
        </button>
        <label className="btn-ghost text-xs cursor-pointer">
          <Upload className="w-3 h-3" /> Import different
          <input type="file" onChange={importKey} accept=".txt" className="hidden" />
        </label>
      </div>

      {importError && (
        <p className="text-xs text-rose-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {importError}
        </p>
      )}
    </div>
  );
}

export default KeyManagement;
