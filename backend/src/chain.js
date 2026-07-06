import { ethers } from 'ethers';

// Minimal read-only ABI — only what enforcement needs.
// Note: the backend reads CIDs through the unrestricted `documents` auto-getter,
// NOT getDocument(), which checks msg.sender and would revert for our provider.
const REGISTRY_ABI = [
  'function documents(bytes32) view returns (string ipfsCID, address owner, uint256 timestamp, string fileName)',
  'function hasAccess(bytes32, address) view returns (bool)',
  'function getUserAccess(bytes32, address) view returns (uint8 level, uint256 expirationTime, uint256 grantedAt, bool isActive, bool isExpired)',
  'function encryptionPublicKeys(address) view returns (bytes)',
];

// Mirrors the AccessLevel enum in DocumentRegistry.sol
export const ACCESS_LEVEL_NAMES = ['none', 'view_only', 'full_access', 'owner'];

/**
 * Read-only view of the DocumentRegistry contract. This is the source of truth
 * for every authorization decision the backend makes.
 */
export function createChainService({ rpcUrl, contractAddress }) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, REGISTRY_ABI, provider);

  return {
    /** Resolve a document's on-chain record; null if it doesn't exist. */
    async getDocument(documentHash) {
      const [ipfsCID, owner, timestamp, fileName] = await contract.documents(documentHash);
      if (timestamp === 0n) return null;
      // BigInt -> Number before these values reach res.json
      return { ipfsCID, owner, timestamp: Number(timestamp), fileName };
    },

    /** True if the address currently has active, unexpired access. */
    hasAccess(documentHash, address) {
      return contract.hasAccess(documentHash, address);
    },

    /** Full access details for an address. */
    async getUserAccess(documentHash, address) {
      const [level, expirationTime, grantedAt, isActive, isExpired] =
        await contract.getUserAccess(documentHash, address);
      return {
        level: ACCESS_LEVEL_NAMES[Number(level)] || 'none',
        expirationTime: Number(expirationTime),
        grantedAt: Number(grantedAt),
        isActive,
        isExpired,
      };
    },
  };
}
