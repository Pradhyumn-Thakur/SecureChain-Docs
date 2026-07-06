import React from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import AccessManagement from '../AccessManagement';
import DocumentManager from '../DocumentManager';
import { Users, Lock } from 'lucide-react';

export default function AccessManagementPage({ documentHash, isDocumentOwner, encryptionKey }) {
  const { isConnected, account } = useWeb3();

  // Documents are stored under an owner-scoped hash; the raw file hash from
  // the upload flow must be scoped the same way before any contract call.
  const scopedDocumentHash = React.useMemo(() => {
    if (!documentHash || !account) return null;
    const fileHash = documentHash.startsWith('0x') ? documentHash : '0x' + documentHash;
    try {
      return ethers.keccak256(ethers.solidityPacked(['address', 'bytes32'], [account, fileHash]));
    } catch {
      return null;
    }
  }, [documentHash, account]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">Access Management</h1>
        <p className="text-sm text-slate-400">Manage permissions and share documents with other users.</p>
      </div>

      {!isConnected ? (
        <div className="card p-8 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Connect your wallet to manage access</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current document access */}
          {scopedDocumentHash && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-accent-400" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm">Current Document</h3>
                  <p className="text-xs text-slate-500 font-mono">{scopedDocumentHash.slice(0, 20)}...{scopedDocumentHash.slice(-10)}</p>
                </div>
              </div>
              <AccessManagement
                documentHash={scopedDocumentHash}
                isOwner={isDocumentOwner}
                encryptionKey={encryptionKey}
                onAccessGranted={(addr, level, exp) => console.log('Access granted:', addr, level, exp)}
                onAccessRevoked={(addr) => console.log('Access revoked:', addr)}
              />
            </div>
          )}

          {/* Document manager */}
          <div className="card p-6">
            <DocumentManager />
          </div>
        </div>
      )}
    </div>
  );
}
