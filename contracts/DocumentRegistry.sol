// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DocumentRegistry {
    // Document structure
    struct Document {
        string ipfsCID;
        address owner;
        uint256 timestamp;
        string fileName;
        mapping(address => bool) authorizedUsers;
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
        address indexed grantedTo
    );
    
    event AccessRevoked(
        bytes32 indexed documentHash,
        address indexed owner,
        address indexed revokedFrom
    );
    
    // Store a new document
    function storeDocument(
        bytes32 _documentHash,
        string memory _ipfsCID,
        string memory _fileName
    ) public {
        require(documents[_documentHash].timestamp == 0, "Document already exists");
        require(bytes(_ipfsCID).length > 0, "IPFS CID required");
        require(bytes(_fileName).length > 0, "File name required");
        
        Document storage newDoc = documents[_documentHash];
        newDoc.ipfsCID = _ipfsCID;
        newDoc.owner = msg.sender;
        newDoc.timestamp = block.timestamp;
        newDoc.fileName = _fileName;
        newDoc.authorizedUsers[msg.sender] = true;
        
        userDocuments[msg.sender].push(_documentHash);
        
        emit DocumentStored(_documentHash, msg.sender, _ipfsCID, block.timestamp);
    }
    
    // Get document details
    function getDocument(bytes32 _documentHash) public view returns (
        string memory ipfsCID,
        address owner,
        uint256 timestamp,
        string memory fileName
    ) {
        Document storage doc = documents[_documentHash];
        require(doc.timestamp != 0, "Document not found");
        require(
            doc.authorizedUsers[msg.sender] || doc.owner == msg.sender,
            "Access denied"
        );
        
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
    
    // Grant access to another user
    function grantAccess(bytes32 _documentHash, address _user) public {
        Document storage doc = documents[_documentHash];
        require(doc.owner == msg.sender, "Only owner can grant access");
        require(doc.timestamp != 0, "Document not found");
        require(_user != address(0), "Invalid user address");
        require(!doc.authorizedUsers[_user], "Access already granted");
        
        doc.authorizedUsers[_user] = true;
        emit AccessGranted(_documentHash, msg.sender, _user);
    }
    
    // Revoke access from a user
    function revokeAccess(bytes32 _documentHash, address _user) public {
        Document storage doc = documents[_documentHash];
        require(doc.owner == msg.sender, "Only owner can revoke access");
        require(doc.timestamp != 0, "Document not found");
        require(doc.authorizedUsers[_user], "Access not granted");
        require(_user != msg.sender, "Cannot revoke own access");
        
        doc.authorizedUsers[_user] = false;
        emit AccessRevoked(_documentHash, msg.sender, _user);
    }
    
    // Check if user has access
    function hasAccess(bytes32 _documentHash, address _user) public view returns (bool) {
        Document storage doc = documents[_documentHash];
        return doc.authorizedUsers[_user];
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