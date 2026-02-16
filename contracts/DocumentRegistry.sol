// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DocumentRegistry {
    // Access level enumeration
    enum AccessLevel {
        NONE,
        VIEW_ONLY,
        FULL_ACCESS,
        OWNER
    }
    
    // Access grant structure with time-based expiration
    struct AccessGrant {
        AccessLevel level;
        uint256 expirationTime; // 0 for permanent access
        uint256 grantedAt;
        bool isActive;
    }
    
    // Document structure
    struct Document {
        string ipfsCID;
        address owner;
        uint256 timestamp;
        string fileName;
        mapping(address => AccessGrant) userAccess;
        address[] accessList; // Track all users with any access
    }
    
    // Main storage: document hash => Document
    mapping(bytes32 => Document) public documents;
    
    // Track documents by owner
    mapping(address => bytes32[]) public userDocuments;
    
    // Events
    event DocumentStored(
        bytes32 indexed documentHash,
        address indexed owner,
        string ipfsCID,
        uint256 timestamp
    );
    
    event AccessGranted(
        bytes32 indexed documentHash,
        address indexed owner,
        address indexed grantedTo,
        AccessLevel level,
        uint256 expirationTime
    );
    
    event AccessRevoked(
        bytes32 indexed documentHash,
        address indexed owner,
        address indexed revokedFrom
    );
    
    event AccessExpired(
        bytes32 indexed documentHash,
        address indexed user
    );
    
    // Store a new document or update existing one (for privacy-focused user-scoped hashes)
    function storeDocument(
        bytes32 _documentHash,
        string memory _ipfsCID,
        string memory _fileName
    ) public {
        require(bytes(_ipfsCID).length > 0, "IPFS CID required");
        require(bytes(_fileName).length > 0, "File name required");
        
        Document storage doc = documents[_documentHash];
        bool isNewDocument = doc.timestamp == 0;
        
        if (isNewDocument) {
            // New document
            doc.owner = msg.sender;
            doc.userAccess[msg.sender] = AccessGrant({
                level: AccessLevel.OWNER,
                expirationTime: 0, // Permanent for owner
                grantedAt: block.timestamp,
                isActive: true
            });
            doc.accessList.push(msg.sender);
            userDocuments[msg.sender].push(_documentHash);
        } else {
            // Existing document - only owner can update
            require(doc.owner == msg.sender, "Only owner can update document");
        }
        
        // Update document data (works for both new and existing)
        doc.ipfsCID = _ipfsCID;
        doc.timestamp = block.timestamp;
        doc.fileName = _fileName;
        
        emit DocumentStored(_documentHash, msg.sender, _ipfsCID, block.timestamp);
    }
    
    // Get document details with access level validation
    function getDocument(bytes32 _documentHash) public view returns (
        string memory ipfsCID,
        address owner,
        uint256 timestamp,
        string memory fileName
    ) {
        Document storage doc = documents[_documentHash];
        require(doc.timestamp != 0, "Document not found");
        
        AccessGrant storage access = doc.userAccess[msg.sender];
        require(_hasValidAccess(access), "Access denied or expired");
        
        return (doc.ipfsCID, doc.owner, doc.timestamp, doc.fileName);
    }
    
    // Get document metadata (publicly accessible)
    function getDocumentMetadata(bytes32 _documentHash) public view returns (
        address owner,
        uint256 timestamp,
        string memory fileName
    ) {
        Document storage doc = documents[_documentHash];
        require(doc.timestamp != 0, "Document not found");
        
        return (doc.owner, doc.timestamp, doc.fileName);
    }
    
    // Verify document exists
    function verifyDocument(bytes32 _documentHash) public view returns (bool) {
        return documents[_documentHash].timestamp != 0;
    }
    
    // Grant access to another user with specific level and expiration
    function grantAccess(
        bytes32 _documentHash, 
        address _user, 
        AccessLevel _level, 
        uint256 _expirationTime
    ) public {
        Document storage doc = documents[_documentHash];
        require(doc.owner == msg.sender, "Only owner can grant access");
        require(doc.timestamp != 0, "Document not found");
        require(_user != address(0), "Invalid user address");
        require(_user != msg.sender, "Cannot grant access to self");
        require(_level != AccessLevel.OWNER, "Cannot grant owner level");
        require(_level != AccessLevel.NONE, "Invalid access level");
        
        // Check if expiration time is valid (0 for permanent, or future time)
        if (_expirationTime != 0) {
            require(_expirationTime > block.timestamp, "Expiration time must be in future");
        }
        
        AccessGrant storage existingAccess = doc.userAccess[_user];
        bool hadAccess = existingAccess.isActive;
        
        // Update or create access grant
        doc.userAccess[_user] = AccessGrant({
            level: _level,
            expirationTime: _expirationTime,
            grantedAt: block.timestamp,
            isActive: true
        });
        
        // Add to access list if new user
        if (!hadAccess) {
            doc.accessList.push(_user);
        }
        
        emit AccessGranted(_documentHash, msg.sender, _user, _level, _expirationTime);
    }
    
    // Revoke access from a user
    function revokeAccess(bytes32 _documentHash, address _user) public {
        Document storage doc = documents[_documentHash];
        require(doc.owner == msg.sender, "Only owner can revoke access");
        require(doc.timestamp != 0, "Document not found");
        require(_user != msg.sender, "Cannot revoke own access");
        
        AccessGrant storage access = doc.userAccess[_user];
        require(access.isActive, "Access not granted or already revoked");
        
        access.isActive = false;
        emit AccessRevoked(_documentHash, msg.sender, _user);
    }
    
    // Check if user has valid access
    function hasAccess(bytes32 _documentHash, address _user) public view returns (bool) {
        Document storage doc = documents[_documentHash];
        AccessGrant storage access = doc.userAccess[_user];
        return _hasValidAccess(access);
    }
    
    // Get user's access level and expiration info
    function getUserAccess(bytes32 _documentHash, address _user) public view returns (
        AccessLevel level,
        uint256 expirationTime,
        uint256 grantedAt,
        bool isActive,
        bool isExpired
    ) {
        Document storage doc = documents[_documentHash];
        AccessGrant storage access = doc.userAccess[_user];
        
        bool expired = access.expirationTime != 0 && block.timestamp > access.expirationTime;
        
        return (
            access.level,
            access.expirationTime,
            access.grantedAt,
            access.isActive,
            expired
        );
    }
    
    // Get all users with access to a document (owner only)
    function getDocumentAccessList(bytes32 _documentHash) public view returns (address[] memory) {
        Document storage doc = documents[_documentHash];
        require(doc.owner == msg.sender, "Only owner can view access list");
        return doc.accessList;
    }
    
    // Cleanup expired access (anyone can call to help maintain blockchain state)
    function cleanupExpiredAccess(bytes32 _documentHash, address _user) public {
        Document storage doc = documents[_documentHash];
        require(doc.timestamp != 0, "Document not found");
        
        AccessGrant storage access = doc.userAccess[_user];
        require(access.isActive, "Access already inactive");
        require(access.expirationTime != 0, "Access is permanent");
        require(block.timestamp > access.expirationTime, "Access not yet expired");
        
        access.isActive = false;
        emit AccessExpired(_documentHash, _user);
    }
    
    // Internal function to validate access
    function _hasValidAccess(AccessGrant storage access) internal view returns (bool) {
        if (!access.isActive) return false;
        if (access.level == AccessLevel.NONE) return false;
        if (access.expirationTime != 0 && block.timestamp > access.expirationTime) return false;
        return true;
    }
    
    // Get user's documents
    function getUserDocuments(address _user) public view returns (bytes32[] memory) {
        return userDocuments[_user];
    }
    
    // Get user's document count
    function getUserDocumentCount(address _user) public view returns (uint256) {
        return userDocuments[_user].length;
    }
    
    // Get document details by owner and index
    function getDocumentByIndex(address _owner, uint256 _index) public view returns (
        bytes32 documentHash,
        string memory ipfsCID,
        uint256 timestamp,
        string memory fileName
    ) {
        require(_index < userDocuments[_owner].length, "Index out of bounds");
        
        bytes32 hash = userDocuments[_owner][_index];
        Document storage doc = documents[hash];
        
        return (hash, doc.ipfsCID, doc.timestamp, doc.fileName);
    }
}