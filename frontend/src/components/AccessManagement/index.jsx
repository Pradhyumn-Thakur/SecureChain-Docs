import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import CryptoUtils, { ACCESS_LEVELS, TIME_UNITS } from '../../utils/crypto';
import { wrapKey, unwrapKey } from '../../utils/keywrap';
import { useWeb3 } from '../../contexts/Web3Context';
import { UserPlus, X, Clock, Shield, AlertCircle, Loader2 } from 'lucide-react';

const AccessManagement = ({ documentHash, isOwner, onAccessGranted, onAccessRevoked, encryptionKey }) => {
  const web3Context = useWeb3();
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGrantForm, setShowGrantForm] = useState(false);

  const [grantForm, setGrantForm] = useState({
    userAddress: '',
    accessLevel: ACCESS_LEVELS.VIEW_ONLY,
    durationType: 'permanent',
    durationValue: '',
    durationUnit: 'days'
  });

  const loadAccessList = useCallback(async () => {
    if (!web3Context?.contract || !documentHash) return;
    setLoading(true);
    try {
      const addresses = await web3Context.contract.getDocumentAccessList(documentHash);
      const accessData = await Promise.all(
        addresses.map(async (address) => {
          const [level, expirationTime, grantedAt, isActive, isExpired] = await web3Context.contract.getUserAccess(documentHash, address);
          return { address, level: parseInt(level), expirationTime: expirationTime.toString(), grantedAt: grantedAt.toString(), isActive, isExpired };
        })
      );
      setAccessList(accessData);
    } catch (err) {
      if (!err.message?.includes('Only owner')) setError('Failed to load access list');
      setAccessList([]);
    } finally { setLoading(false); }
  }, [web3Context?.contract, documentHash]);

  useEffect(() => {
    if (documentHash && isOwner && web3Context?.contract) loadAccessList();
  }, [documentHash, isOwner, web3Context?.contract, loadAccessList]);

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!web3Context?.contract || !documentHash) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!web3Context.isValidAddress(grantForm.userAddress)) throw new Error('Invalid wallet address');
      if (grantForm.userAddress.toLowerCase() === web3Context.account?.toLowerCase()) throw new Error('Cannot grant access to yourself');

      let expirationTime = 0;
      if (grantForm.durationType !== 'permanent') {
        const duration = parseInt(grantForm.durationValue);
        if (isNaN(duration) || duration <= 0) throw new Error('Duration must be positive');
        if (duration > 365 && grantForm.durationUnit === 'days') throw new Error('Max 365 days');
        const multiplier = TIME_UNITS[grantForm.durationUnit.toUpperCase()] || TIME_UNITS.DAYS;
        expirationTime = Math.floor((Date.now() + (duration * multiplier)) / 1000);
      }

      // The recipient needs the document key to actually read the file.
      // Look up their registered encryption public key on-chain...
      const recipientPublicKey = await web3Context.contract.encryptionPublicKeys(grantForm.userAddress);
      if (!recipientPublicKey || recipientPublicKey === '0x') {
        throw new Error('This address has not registered an encryption key yet. Ask them to connect their wallet and register first.');
      }

      // ...obtain the raw document key (passed-in key, or recover the
      // self-wrapped copy from the chain with a wallet signature)...
      let rawDocumentKey;
      if (encryptionKey) {
        const hex = await CryptoUtils.exportKey(encryptionKey);
        rawDocumentKey = ethers.getBytes('0x' + hex);
      } else {
        const selfWrapped = await web3Context.contract.getEncryptedKey(documentHash, web3Context.account);
        if (!selfWrapped || selfWrapped === '0x') {
          throw new Error('Document key unavailable. Load the encryption key for this document, then try again.');
        }
        const identity = await web3Context.ensureEncryptionIdentity();
        rawDocumentKey = await unwrapKey(identity.privateKey, selfWrapped);
      }

      // ...and wrap it to the recipient so the grant also delivers the key.
      const wrappedForRecipient = await wrapKey(recipientPublicKey, rawDocumentKey);

      const accessLevelValue = grantForm.accessLevel === ACCESS_LEVELS.VIEW_ONLY ? 1 : 2;
      const tx = await web3Context.contract.grantAccess(
        documentHash,
        grantForm.userAddress,
        accessLevelValue,
        expirationTime,
        wrappedForRecipient
      );
      await tx.wait();

      setGrantForm({ userAddress: '', accessLevel: ACCESS_LEVELS.VIEW_ONLY, durationType: 'permanent', durationValue: '', durationUnit: 'days' });
      setShowGrantForm(false);
      await loadAccessList();

      const levelName = grantForm.accessLevel === ACCESS_LEVELS.VIEW_ONLY ? 'View Only' : 'Full Access';
      setSuccess(`${levelName} access granted successfully`);
      setTimeout(() => setSuccess(''), 5000);
      onAccessGranted?.(grantForm.userAddress, grantForm.accessLevel, expirationTime);
    } catch (err) {
      const msg = err.message || 'Failed to grant access';
      setError(msg.includes('User denied') || msg.includes('User rejected') ? 'Transaction cancelled' : msg);
    } finally { setLoading(false); }
  };

  const handleRevoke = async (userAddress) => {
    if (!web3Context?.contract || !documentHash) return;
    if (!window.confirm(`Revoke access for ${userAddress}?`)) return;
    setLoading(true);
    setError('');
    try {
      const tx = await web3Context.contract.revokeAccess(documentHash, userAddress);
      await tx.wait();
      await loadAccessList();
      setSuccess('Access revoked');
      setTimeout(() => setSuccess(''), 5000);
      onAccessRevoked?.(userAddress);
    } catch (err) {
      const msg = err.message || 'Failed to revoke';
      setError(msg.includes('User denied') ? 'Transaction cancelled' : msg);
    } finally { setLoading(false); }
  };

  const getLevelName = (level) => ({ 1: 'View Only', 2: 'Full Access', 3: 'Owner' }[level] || 'None');
  const formatExpiration = (ts) => !ts || ts === '0' ? 'Permanent' : new Date(parseInt(ts) * 1000).toLocaleString();
  const isExpiringSoon = (ts) => {
    if (!ts || ts === '0') return false;
    const exp = parseInt(ts) * 1000;
    return exp - Date.now() < 86400000 && exp > Date.now();
  };

  if (!isOwner) {
    return (
      <div className="flex gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-400">Only the document owner can manage access permissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-display font-semibold text-white text-sm">Access Permissions</h4>
        <button
          onClick={() => setShowGrantForm(!showGrantForm)}
          disabled={loading}
          className={showGrantForm ? 'btn-ghost text-xs' : 'btn-primary text-xs py-2'}
        >
          {showGrantForm ? <><X className="w-3 h-3" /> Cancel</> : <><UserPlus className="w-3 h-3" /> Grant Access</>}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <p className="text-xs text-emerald-400">{success}</p>
        </div>
      )}

      {/* Grant form */}
      {showGrantForm && (
        <form onSubmit={handleGrantAccess} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-4">
          <div className="space-y-1.5">
            <label className="label-text">Wallet Address</label>
            <input
              type="text"
              value={grantForm.userAddress}
              onChange={(e) => setGrantForm({ ...grantForm, userAddress: e.target.value.trim() })}
              placeholder="0x..."
              className="input-field font-mono text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label-text">Access Level</label>
              <select
                value={grantForm.accessLevel}
                onChange={(e) => setGrantForm({ ...grantForm, accessLevel: e.target.value })}
                className="input-field text-xs"
              >
                <option value={ACCESS_LEVELS.VIEW_ONLY}>View Only</option>
                <option value={ACCESS_LEVELS.FULL_ACCESS}>Full Access</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Duration</label>
              <select
                value={grantForm.durationType}
                onChange={(e) => setGrantForm({ ...grantForm, durationType: e.target.value })}
                className="input-field text-xs"
              >
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
          </div>

          {grantForm.durationType === 'temporary' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="label-text">Amount</label>
                <input
                  type="number"
                  value={grantForm.durationValue}
                  onChange={(e) => setGrantForm({ ...grantForm, durationValue: e.target.value })}
                  min="1"
                  className="input-field text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-text">Unit</label>
                <select
                  value={grantForm.durationUnit}
                  onChange={(e) => setGrantForm({ ...grantForm, durationUnit: e.target.value })}
                  className="input-field text-xs"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-xs">
              {loading ? <><Loader2 className="w-3 h-3 animate-spin" /> Granting...</> : 'Grant Access'}
            </button>
            <button type="button" onClick={() => setShowGrantForm(false)} className="btn-secondary text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Access list */}
      <div className="space-y-2">
        {loading && !showGrantForm && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            <span className="text-xs text-slate-500">Loading access list...</span>
          </div>
        )}

        {accessList.length === 0 && !loading && (
          <div className="text-center py-6">
            <Shield className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">No permissions granted</p>
            <p className="text-xs text-slate-500 mt-1">Only you have access to this document.</p>
          </div>
        )}

        {accessList.map((access, i) => (
          <div
            key={i}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors
              ${access.isExpired ? 'bg-white/[0.01] border-white/[0.04] opacity-50' : access.isActive ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-rose-500/5 border-rose-500/10 opacity-60'}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 font-mono truncate">{access.address}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={access.level === 2 ? 'badge-amber' : 'badge-cyan'}>{getLevelName(access.level)}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {formatExpiration(access.expirationTime)}
                </span>
                {isExpiringSoon(access.expirationTime) && <span className="badge-rose">Expiring soon</span>}
                {access.isExpired && <span className="badge-rose">Expired</span>}
                {!access.isActive && !access.isExpired && <span className="badge-slate">Revoked</span>}
              </div>
            </div>
            {access.isActive && !access.isExpired && access.level !== 3 && (
              <button onClick={() => handleRevoke(access.address)} disabled={loading} className="btn-danger text-xs py-1.5 px-3 ml-3 shrink-0">
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccessManagement;
