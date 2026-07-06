import FormData from 'form-data';
import fetch from 'node-fetch';
import { PinataSDK } from 'pinata';

/**
 * Pinata-backed IPFS storage. Extracted from the route handlers so the app can
 * be tested with a fake storage service injected in its place.
 */
export function createStorageService({ pinataJwt }) {
  const pinata = new PinataSDK({ pinataJwt });

  return {
    async testConnection() {
      return pinata.testAuthentication();
    },

    /** Pin an encrypted file buffer; returns { cid, size, timestamp }. */
    async uploadFile({ buffer, fileName, mimeType, keyvalues }) {
      const formData = new FormData();
      formData.append('file', buffer, {
        filename: fileName,
        contentType: mimeType || 'application/octet-stream',
      });
      formData.append('pinataMetadata', JSON.stringify({
        name: `Encrypted: ${fileName}`,
        keyvalues,
      }));
      formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pinataJwt}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return { cid: result.IpfsHash, size: result.PinSize, timestamp: result.Timestamp };
    },

    /** Fetch a pinned file's bytes by CID, with a public-gateway fallback. */
    async fetchByCid(cid) {
      let response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);

      if (!response.ok) {
        console.warn(`Pinata gateway failed (${response.status}) for ${cid}, trying ipfs.io`);
        response = await fetch(`https://ipfs.io/ipfs/${cid}`);
        if (!response.ok) {
          return null;
        }
      }

      return Buffer.from(await response.arrayBuffer());
    },

    async listFiles(limit = 10) {
      const response = await fetch(
        `https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=${limit}`,
        { headers: { 'Authorization': `Bearer ${pinataJwt}` } }
      );
      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status}`);
      }
      const result = await response.json();
      return { files: result.rows || [], count: result.count || 0 };
    },

    async unpin(cid) {
      await pinata.files.delete([cid]);
    },

    async getUsage() {
      if (!pinata.usage || typeof pinata.usage.get !== 'function') {
        return null;
      }
      const response = await pinata.usage.get();
      return {
        totalStorage: response.total_storage_size,
        storageLimit: response.total_storage_size_limit,
        fileCount: response.pin_count,
        fileLimit: response.pin_count_limit,
      };
    },
  };
}
