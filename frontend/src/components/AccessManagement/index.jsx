import React, { useState, useEffect, useCallback } from 'react';
import './AccessManagement.css';
import { ACCESS_LEVELS, TIME_UNITS } from '../../utils/crypto';
import { useWeb3 } from '../../contexts/Web3Context';

const AccessManagement = ({ 
  documentHash, 
  isOwner, 
  onAccessGranted, 
  onAccessRevoked,
  encryptionKey
}) => {
  const web3Context = useWeb3();
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGrantForm, setShowGrantForm] = useState(false);
  
  // Grant access form state
  const [grantForm, setGrantForm] = useState({
    userAddress: '',
    accessLevel: ACCESS_LEVELS.VIEW_ONLY,
    durationType: 'permanent',
    durationValue: '',
    durationUnit: 'days'
  });

  // Define loadAccessList before useEffect
  const loadAccessList = useCallback(async () => {
    if (!web3Context?.contract || !documentHash) return;
    
    setLoading(true);
    try {
      // Get list of users with access to this document
      const accessAddresses = await web3Context.contract.getDocumentAccessList(documentHash);
      
      // Get detailed access information for each user
      const accessPromises = accessAddresses.map(async (address) => {
        const [level, expirationTime, grantedAt, isActive, isExpired] = await web3Context.contract.getUserAccess(documentHash, address);
        return {
          address,
          level: parseInt(level),
          expirationTime: expirationTime.toString(),
          grantedAt: grantedAt.toString(),
          isActive,
          isExpired
        };
      });
      
      const accessData = await Promise.all(accessPromises);
      setAccessList(accessData);
      
    } catch (err) {
      console.error('Failed to load access list:', err);
      // If the user is not the owner, they can't view the access list
      if (err.message?.includes('Only owner can view access list')) {
        setAccessList([]);
      } else {
        setError('Failed to load access list: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [web3Context?.contract, documentHash]);

  useEffect(() => {
    if (documentHash && isOwner && web3Context?.contract) {
      loadAccessList();
    }
  }, [documentHash, isOwner, web3Context?.contract, loadAccessList]);

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!web3Context?.contract || !documentHash) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate wallet address
      if (!web3Context.isValidAddress(grantForm.userAddress)) {
        throw new Error('Invalid MetaMask wallet address');
      }
      
      // Prevent granting access to self
      if (grantForm.userAddress.toLowerCase() === web3Context.account?.toLowerCase()) {
        throw new Error('Cannot grant access to yourself');
      }
      
      // Note: Cannot check for existing access due to contract limitations
      // The contract doesn't provide methods to retrieve current access list
      
      // Calculate expiration time
      let expirationTime = 0;
      if (grantForm.durationType !== 'permanent') {
        const duration = parseInt(grantForm.durationValue);
        if (isNaN(duration) || duration <= 0) {
          throw new Error('Duration must be a positive number');
        }
        
        if (duration > 365 && grantForm.durationUnit === 'days') {
          throw new Error('Duration cannot exceed 365 days');
        }
        
        const multiplier = TIME_UNITS[grantForm.durationUnit.toUpperCase()] || TIME_UNITS.DAYS;
        expirationTime = Math.floor((Date.now() + (duration * multiplier)) / 1000);
      }
      
      // Convert access level to enum value
      const accessLevelValue = grantForm.accessLevel === ACCESS_LEVELS.VIEW_ONLY ? 1 : 2;
      
      // Grant access on blockchain with full advanced features
      await web3Context.contract.grantAccess(documentHash, grantForm.userAddress, accessLevelValue, expirationTime);
      
      // Reset form and reload access list
      setGrantForm({
        userAddress: '',
        accessLevel: ACCESS_LEVELS.VIEW_ONLY,
        durationType: 'permanent',
        durationValue: '',
        durationUnit: 'days'
      });
      setShowGrantForm(false);
      
      // Reload access list to show the new access
      await loadAccessList();
      
      // Show success message
      const accessLevelName = grantForm.accessLevel === ACCESS_LEVELS.VIEW_ONLY ? 'View Only' : 'Full Access';
      const durationText = grantForm.durationType === 'permanent' ? 'permanent' : `for ${grantForm.durationValue} ${grantForm.durationUnit}`;
      setSuccess(`${accessLevelName} access granted successfully to ${grantForm.userAddress} (${durationText}).`);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
      if (onAccessGranted) {
        onAccessGranted(grantForm.userAddress, grantForm.accessLevel, expirationTime);
      }
      
    } catch (err) {
      console.error('Failed to grant access:', err);
      const errorMessage = err.message || 'Failed to grant access';
      setError(errorMessage);
      
      // If it's a user cancellation, don't show as error
      if (errorMessage.includes('User denied transaction') || 
          errorMessage.includes('User rejected') ||
          errorMessage.includes('user rejected transaction')) {
        setError('Transaction was cancelled by user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (userAddress) => {
    if (!web3Context?.contract || !documentHash) return;
    if (!window.confirm(`Are you sure you want to revoke access for ${userAddress}?`)) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await web3Context.contract.revokeAccess(documentHash, userAddress);
      
      // Reload access list to reflect the revoked access
      await loadAccessList();
      
      // Show success message
      setSuccess(`Access revoked successfully from ${userAddress}`);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
      if (onAccessRevoked) {
        onAccessRevoked(userAddress);
      }
      
    } catch (err) {
      console.error('Failed to revoke access:', err);
      const errorMessage = err.message || 'Failed to revoke access';
      setError(errorMessage);
      
      // If it's a user cancellation, don't show as error
      if (errorMessage.includes('User denied transaction') || 
          errorMessage.includes('User rejected') ||
          errorMessage.includes('user rejected transaction')) {
        setError('Transaction was cancelled by user');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAccessLevelName = (level) => {
    switch (level) {
      case 1: return 'View Only';
      case 2: return 'Full Access';
      case 3: return 'Owner';
      default: return 'None';
    }
  };

  const formatExpirationTime = (timestamp) => {
    if (!timestamp || timestamp === '0') return 'Permanent';
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
  };

  const isExpiringSoon = (timestamp) => {
    if (!timestamp || timestamp === '0') return false;
    const expirationTime = parseInt(timestamp) * 1000;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return expirationTime - now < oneDayMs && expirationTime > now;
  };

  if (!isOwner) {
    return (
      <div className="access-management">
        <div className="access-notice">
          <p>Only the document owner can manage access permissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="access-management">
      <div className="access-header">
        <h3>Access Management</h3>
        <button 
          className="btn btn-primary"
          onClick={() => setShowGrantForm(!showGrantForm)}
          disabled={loading}
        >
          {showGrantForm ? 'Cancel' : 'Grant Access'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {showGrantForm && (
        <form className="grant-access-form" onSubmit={handleGrantAccess}>
          <div className="contract-feature-notice">
            <p><strong>✅ Advanced Features Available:</strong> This contract supports access levels, expiration times, and access list management.</p>
          </div>
          
          <div className="form-group">
            <label htmlFor="userAddress">MetaMask Wallet Address:</label>
            <input
              type="text"
              id="userAddress"
              value={grantForm.userAddress}
              onChange={(e) => setGrantForm({...grantForm, userAddress: e.target.value.trim()})}
              placeholder="MetaMask address (0x...)"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="accessLevel">Access Level:</label>
            <select
              id="accessLevel"
              value={grantForm.accessLevel}
              onChange={(e) => setGrantForm({...grantForm, accessLevel: e.target.value})}
            >
              <option value={ACCESS_LEVELS.VIEW_ONLY}>View Only (can read but not download)</option>
              <option value={ACCESS_LEVELS.FULL_ACCESS}>Full Access (can read and download)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="durationType">Duration:</label>
            <select
              id="durationType"
              value={grantForm.durationType}
              onChange={(e) => setGrantForm({...grantForm, durationType: e.target.value})}
            >
              <option value="permanent">Permanent</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>

          {grantForm.durationType === 'temporary' && (
            <div className="duration-inputs">
              <div className="form-group">
                <label htmlFor="durationValue">Duration:</label>
                <input
                  type="number"
                  id="durationValue"
                  value={grantForm.durationValue}
                  onChange={(e) => setGrantForm({...grantForm, durationValue: e.target.value})}
                  min="1"
                  max={grantForm.durationUnit === 'days' ? '365' : grantForm.durationUnit === 'hours' ? '8760' : '525600'}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="durationUnit">Unit:</label>
                <select
                  id="durationUnit"
                  value={grantForm.durationUnit}
                  onChange={(e) => setGrantForm({...grantForm, durationUnit: e.target.value})}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Granting...' : 'Grant Access'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setShowGrantForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="access-list">
        <h4>Current Access Permissions</h4>
        
        {loading && !showGrantForm && (
          <div className="loading">Loading access list...</div>
        )}

        {accessList.length === 0 && !loading ? (
          <div className="no-access">
            <p><strong>No Access Permissions Granted</strong></p>
            <p>This document has no additional access permissions. Only you (the owner) have access to this document.</p>
            <p>Use the "Grant Access" button above to give access to other users.</p>
          </div>
        ) : (
          <div className="access-items">
            {accessList.map((access, index) => (
              <div 
                key={index} 
                className={`access-item ${access.isExpired ? 'expired' : ''} ${!access.isActive ? 'revoked' : ''}`}
              >
                <div className="access-info">
                  <div className="user-address">{access.address}</div>
                  <div className="access-details">
                    <span className="access-level">{getAccessLevelName(access.level)}</span>
                    <span className="expiration">
                      Expires: {formatExpirationTime(access.expirationTime)}
                    </span>
                    {isExpiringSoon(access.expirationTime) && (
                      <span className="expiring-soon">Expiring soon!</span>
                    )}
                  </div>
                  <div className="access-status">
                    {access.isExpired ? 'Expired' : access.isActive ? 'Active' : 'Revoked'}
                  </div>
                </div>
                
                {access.isActive && !access.isExpired && access.level !== 3 && (
                  <div className="access-actions">
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleRevokeAccess(access.address)}
                      disabled={loading}
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessManagement;