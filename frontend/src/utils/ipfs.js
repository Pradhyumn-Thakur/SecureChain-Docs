class IPFSService {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3001/api';
    this.token = null;
    this.initialized = false;
  }

  // Initialize with backend authentication
  async initialize() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with backend');
      }

      const data = await response.json();
      this.token = data.token;
      this.initialized = true;
      
      // Set up token refresh before expiration
      this.scheduleTokenRefresh();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize IPFS service:', error);
      this.initialized = false;
      return false;
    }
  }

  // Schedule token refresh
  scheduleTokenRefresh() {
    // Refresh token 1 minute before expiration (14 minutes)
    setTimeout(() => {
      this.initialize();
    }, 14 * 60 * 1000);
  }

  // Get authorization headers
  getAuthHeaders() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  // Check if service is properly initialized
  isInitialized() {
    return this.initialized && this.token;
  }

  // Upload encrypted file to IPFS with pinning
  async uploadEncryptedFile(encryptedData, metadata = {}) {
    if (!this.isInitialized()) {
      throw new Error('IPFS service not initialized. Please authenticate first.');
    }

    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Create a blob from the encrypted data
      const blob = new Blob([encryptedData.encryptedData], { 
        type: 'application/octet-stream' 
      });

      // Add file to FormData
      formData.append('file', blob, `encrypted_${encryptedData.fileName}`);
      
      // Prepare metadata (keep minimal to stay under Pinata's 10-key limit)
      // Note: IV is already embedded in encrypted data, no need to store separately
      const fileMetadata = {
        originalHash: encryptedData.originalHash,
        algorithm: metadata.algorithm || 'AES-256-GCM'
      };
      
      formData.append('metadata', JSON.stringify(fileMetadata));

      // Upload to backend API
      const response = await fetch(`${this.apiBaseUrl}/ipfs/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('File uploaded to IPFS:', result);

      return {
        cid: result.cid,
        ipfsHash: result.cid,
        size: result.size,
        timestamp: result.timestamp,
        metadata: result.metadata
      };

    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  // Retrieve encrypted file from IPFS
  async retrieveEncryptedFile(cid) {
    if (!this.isInitialized()) {
      throw new Error('IPFS service not initialized. Please authenticate first.');
    }

    console.log(`IPFS service: Attempting to retrieve CID: ${cid}`);
    console.log(`Request URL: ${this.apiBaseUrl}/ipfs/retrieve/${cid}`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/ipfs/retrieve/${cid}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Retrieval failed');
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('No data received from IPFS');
      }

      return {
        data: result.data,
        metadata: result.metadata || {},
        cid: result.cid
      };

    } catch (error) {
      console.error('IPFS retrieval failed:', error);
      throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
    }
  }

  // Test connection to backend/Pinata
  async testConnection() {
    if (!this.isInitialized()) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/ipfs/test`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Connection test failed');
      }

      const result = await response.json();
      return { success: result.success, message: result.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Connection test failed' 
      };
    }
  }

  // Get file list (for debugging/management)
  async listFiles(limit = 10) {
    if (!this.isInitialized()) {
      throw new Error('IPFS service not initialized');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/ipfs/files?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to list files');
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('Failed to list files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Delete/unpin file (use with caution)
  async unpinFile(cid) {
    if (!this.isInitialized()) {
      throw new Error('IPFS service not initialized');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/ipfs/files/${cid}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unpin file');
      }

      return true;
    } catch (error) {
      console.error('Failed to unpin file:', error);
      throw new Error(`Failed to unpin file: ${error.message}`);
    }
  }

  // Get usage statistics
  async getUsageStats() {
    if (!this.isInitialized()) {
      throw new Error('IPFS service not initialized');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/ipfs/usage`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get usage stats');
      }

      const result = await response.json();
      return result.usage || null;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate IPFS gateway URL
  getGatewayUrl(cid, gateway = 'https://gateway.pinata.cloud') {
    return `${gateway}/ipfs/${cid}`;
  }
}

// Create singleton instance
const ipfsService = new IPFSService();

export default ipfsService;

// Helper functions for easy importing
export const uploadToIPFS = (encryptedData, metadata) => 
  ipfsService.uploadEncryptedFile(encryptedData, metadata);

export const retrieveFromIPFS = (cid) => 
  ipfsService.retrieveEncryptedFile(cid);

export const initializeIPFS = () => 
  ipfsService.initialize();

export const testIPFSConnection = () => 
  ipfsService.testConnection();