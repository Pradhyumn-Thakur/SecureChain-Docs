const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// AccessLevel enum values (must mirror DocumentRegistry.sol)
const NONE = 0;
const VIEW_ONLY = 1;
const FULL_ACCESS = 2;
const OWNER = 3;

// Realistic fixture values
const FILE_HASH = ethers.keccak256(ethers.toUtf8Bytes("file contents"));
const CID = "QmTestCid1234567890abcdefghijklmnopqrstuvwx";
const FILE_NAME = "report.pdf";

// 94-byte ECIES blob shape: 0x01 || ephPub(33) || iv(12) || ciphertext+tag(48)
function fakeWrappedKey() {
  return ethers.concat(["0x01", ethers.randomBytes(33 + 12 + 48)]);
}

// 33-byte compressed secp256k1 public key
function fakePubKey(prefix = "0x02") {
  return ethers.concat([prefix, ethers.randomBytes(32)]);
}

function scopedHash(ownerAddress, fileHash = FILE_HASH) {
  return ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [ownerAddress, fileHash]));
}

describe("DocumentRegistry", function () {
  async function deployFixture() {
    const [owner, grantee, stranger] = await ethers.getSigners();
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    const registry = await DocumentRegistry.deploy();
    return { registry, owner, grantee, stranger };
  }

  async function storedDocumentFixture() {
    const ctx = await deployFixture();
    const { registry, owner } = ctx;
    const docHash = scopedHash(owner.address);
    const ownerKey = fakeWrappedKey();
    await registry.connect(owner).storeDocument(docHash, CID, FILE_NAME, ownerKey);
    return { ...ctx, docHash, ownerKey };
  }

  describe("storeDocument", function () {
    it("stores a document and the owner's self-wrapped key", async function () {
      const { registry, owner, docHash, ownerKey } = await loadFixture(storedDocumentFixture);

      const doc = await registry.documents(docHash);
      expect(doc.ipfsCID).to.equal(CID);
      expect(doc.owner).to.equal(owner.address);
      expect(doc.fileName).to.equal(FILE_NAME);
      expect(doc.timestamp).to.not.equal(0n);

      expect(await registry.getEncryptedKey(docHash, owner.address)).to.equal(ownerKey);
      expect(await registry.hasAccess(docHash, owner.address)).to.equal(true);

      const [level] = await registry.getUserAccess(docHash, owner.address);
      expect(level).to.equal(OWNER);
    });

    it("emits DocumentStored", async function () {
      const { registry, owner } = await loadFixture(deployFixture);
      const docHash = scopedHash(owner.address);
      await expect(registry.storeDocument(docHash, CID, FILE_NAME, fakeWrappedKey()))
        .to.emit(registry, "DocumentStored")
        .withArgs(docHash, owner.address, CID, anyUint);
    });

    it("exposes the CID via the public documents getter (backend read path)", async function () {
      const { registry, docHash } = await loadFixture(storedDocumentFixture);
      // The backend resolves CIDs through this unrestricted auto-getter
      const doc = await registry.documents(docHash);
      expect(doc.ipfsCID).to.equal(CID);
    });

    it("lets the owner update their document and refresh the self-wrapped key", async function () {
      const { registry, owner, docHash } = await loadFixture(storedDocumentFixture);
      const newKey = fakeWrappedKey();
      await registry.connect(owner).storeDocument(docHash, "QmNewCid", "v2.pdf", newKey);

      const doc = await registry.documents(docHash);
      expect(doc.ipfsCID).to.equal("QmNewCid");
      expect(await registry.getEncryptedKey(docHash, owner.address)).to.equal(newKey);
    });

    it("rejects updates from non-owners", async function () {
      const { registry, stranger, docHash } = await loadFixture(storedDocumentFixture);
      await expect(
        registry.connect(stranger).storeDocument(docHash, "QmEvil", "evil.pdf", fakeWrappedKey())
      ).to.be.revertedWith("Only owner can update document");
    });

    it("rejects empty CID, empty file name, and oversized keys", async function () {
      const { registry, owner } = await loadFixture(deployFixture);
      const docHash = scopedHash(owner.address);
      await expect(registry.storeDocument(docHash, "", FILE_NAME, fakeWrappedKey()))
        .to.be.revertedWith("IPFS CID required");
      await expect(registry.storeDocument(docHash, CID, "", fakeWrappedKey()))
        .to.be.revertedWith("File name required");
      await expect(registry.storeDocument(docHash, CID, FILE_NAME, ethers.randomBytes(257)))
        .to.be.revertedWith("Encrypted key too large");
    });
  });

  describe("getDocument access restriction", function () {
    it("reverts for callers without access", async function () {
      const { registry, stranger, docHash } = await loadFixture(storedDocumentFixture);
      await expect(registry.connect(stranger).getDocument(docHash))
        .to.be.revertedWith("Access denied or expired");
    });

    it("returns details for the owner", async function () {
      const { registry, owner, docHash } = await loadFixture(storedDocumentFixture);
      const [ipfsCID, docOwner] = await registry.connect(owner).getDocument(docHash);
      expect(ipfsCID).to.equal(CID);
      expect(docOwner).to.equal(owner.address);
    });
  });

  describe("registerEncryptionKey", function () {
    it("registers a 33-byte compressed key and emits the event", async function () {
      const { registry, grantee } = await loadFixture(deployFixture);
      const pubKey = fakePubKey("0x02");

      await expect(registry.connect(grantee).registerEncryptionKey(pubKey))
        .to.emit(registry, "EncryptionKeyRegistered")
        .withArgs(grantee.address, pubKey);

      expect(await registry.encryptionPublicKeys(grantee.address)).to.equal(ethers.hexlify(pubKey));
    });

    it("accepts the 0x03 prefix and allows overwriting", async function () {
      const { registry, grantee } = await loadFixture(deployFixture);
      await registry.connect(grantee).registerEncryptionKey(fakePubKey("0x02"));
      const newKey = fakePubKey("0x03");
      await registry.connect(grantee).registerEncryptionKey(newKey);
      expect(await registry.encryptionPublicKeys(grantee.address)).to.equal(ethers.hexlify(newKey));
    });

    it("rejects wrong lengths and prefixes", async function () {
      const { registry, grantee } = await loadFixture(deployFixture);
      await expect(registry.connect(grantee).registerEncryptionKey(ethers.randomBytes(32)))
        .to.be.revertedWith("Invalid public key length");
      await expect(registry.connect(grantee).registerEncryptionKey(ethers.randomBytes(65)))
        .to.be.revertedWith("Invalid public key length");
      const badPrefix = ethers.concat(["0x04", ethers.randomBytes(32)]);
      await expect(registry.connect(grantee).registerEncryptionKey(badPrefix))
        .to.be.revertedWith("Invalid public key prefix");
    });

    it("returns empty bytes for unregistered users", async function () {
      const { registry, stranger } = await loadFixture(deployFixture);
      expect(await registry.encryptionPublicKeys(stranger.address)).to.equal("0x");
    });
  });

  describe("grantAccess", function () {
    it("stores the wrapped key and grants access", async function () {
      const { registry, owner, grantee, docHash } = await loadFixture(storedDocumentFixture);
      const wrapped = fakeWrappedKey();

      await expect(
        registry.connect(owner).grantAccess(docHash, grantee.address, FULL_ACCESS, 0, wrapped)
      )
        .to.emit(registry, "AccessGranted")
        .withArgs(docHash, owner.address, grantee.address, FULL_ACCESS, 0);

      expect(await registry.hasAccess(docHash, grantee.address)).to.equal(true);
      expect(await registry.getEncryptedKey(docHash, grantee.address)).to.equal(wrapped);

      const [level, expiration, , isActive, isExpired] =
        await registry.getUserAccess(docHash, grantee.address);
      expect(level).to.equal(FULL_ACCESS);
      expect(expiration).to.equal(0n);
      expect(isActive).to.equal(true);
      expect(isExpired).to.equal(false);
    });

    it("adds the document to the grantee's shared index", async function () {
      const { registry, owner, grantee, docHash } = await loadFixture(storedDocumentFixture);
      await registry.connect(owner).grantAccess(docHash, grantee.address, VIEW_ONLY, 0, fakeWrappedKey());

      const shared = await registry.getSharedDocuments(grantee.address);
      expect(shared).to.deep.equal([docHash]);
    });

    it("does not duplicate indexes on re-grant after revoke", async function () {
      const { registry, owner, grantee, docHash } = await loadFixture(storedDocumentFixture);
      await registry.connect(owner).grantAccess(docHash, grantee.address, FULL_ACCESS, 0, fakeWrappedKey());
      await registry.connect(owner).revokeAccess(docHash, grantee.address);
      await registry.connect(owner).grantAccess(docHash, grantee.address, VIEW_ONLY, 0, fakeWrappedKey());

      const shared = await registry.getSharedDocuments(grantee.address);
      expect(shared).to.deep.equal([docHash]);
      const accessList = await registry.connect(owner).getDocumentAccessList(docHash);
      // owner + grantee, no duplicates
      expect(accessList).to.deep.equal([owner.address, grantee.address]);
    });

    it("rejects invalid grants", async function () {
      const { registry, owner, grantee, stranger, docHash } = await loadFixture(storedDocumentFixture);
      const wrapped = fakeWrappedKey();

      await expect(
        registry.connect(stranger).grantAccess(docHash, grantee.address, FULL_ACCESS, 0, wrapped)
      ).to.be.revertedWith("Only owner can grant access");

      await expect(
        registry.connect(owner).grantAccess(docHash, owner.address, FULL_ACCESS, 0, wrapped)
      ).to.be.revertedWith("Cannot grant access to self");

      await expect(
        registry.connect(owner).grantAccess(docHash, grantee.address, OWNER, 0, wrapped)
      ).to.be.revertedWith("Cannot grant owner level");

      await expect(
        registry.connect(owner).grantAccess(docHash, grantee.address, NONE, 0, wrapped)
      ).to.be.revertedWith("Invalid access level");

      await expect(
        registry.connect(owner).grantAccess(docHash, grantee.address, FULL_ACCESS, 0, "0x")
      ).to.be.revertedWith("Encrypted key required");

      const past = (await time.latest()) - 100;
      await expect(
        registry.connect(owner).grantAccess(docHash, grantee.address, FULL_ACCESS, past, wrapped)
      ).to.be.revertedWith("Expiration time must be in future");
    });
  });

  describe("revokeAccess", function () {
    it("revokes access and deletes the wrapped key", async function () {
      const { registry, owner, grantee, docHash } = await loadFixture(storedDocumentFixture);
      await registry.connect(owner).grantAccess(docHash, grantee.address, FULL_ACCESS, 0, fakeWrappedKey());

      await expect(registry.connect(owner).revokeAccess(docHash, grantee.address))
        .to.emit(registry, "AccessRevoked")
        .withArgs(docHash, owner.address, grantee.address);

      expect(await registry.hasAccess(docHash, grantee.address)).to.equal(false);
      expect(await registry.getEncryptedKey(docHash, grantee.address)).to.equal("0x");
    });

    it("only the owner can revoke, and only active grants", async function () {
      const { registry, owner, grantee, stranger, docHash } = await loadFixture(storedDocumentFixture);
      await registry.connect(owner).grantAccess(docHash, grantee.address, FULL_ACCESS, 0, fakeWrappedKey());

      await expect(registry.connect(stranger).revokeAccess(docHash, grantee.address))
        .to.be.revertedWith("Only owner can revoke access");

      await registry.connect(owner).revokeAccess(docHash, grantee.address);
      await expect(registry.connect(owner).revokeAccess(docHash, grantee.address))
        .to.be.revertedWith("Access not granted or already revoked");
    });
  });

  describe("expiration", function () {
    it("expires access after the deadline", async function () {
      const { registry, owner, grantee, docHash } = await loadFixture(storedDocumentFixture);
      const expiration = (await time.latest()) + 3600;
      await registry.connect(owner).grantAccess(docHash, grantee.address, FULL_ACCESS, expiration, fakeWrappedKey());

      expect(await registry.hasAccess(docHash, grantee.address)).to.equal(true);

      await time.increaseTo(expiration + 1);

      expect(await registry.hasAccess(docHash, grantee.address)).to.equal(false);
      const [, , , isActive, isExpired] = await registry.getUserAccess(docHash, grantee.address);
      expect(isActive).to.equal(true); // still marked active until cleanup
      expect(isExpired).to.equal(true);
    });

    it("cleanupExpiredAccess deactivates expired grants", async function () {
      const { registry, owner, grantee, stranger, docHash } = await loadFixture(storedDocumentFixture);
      const expiration = (await time.latest()) + 3600;
      await registry.connect(owner).grantAccess(docHash, grantee.address, VIEW_ONLY, expiration, fakeWrappedKey());

      await expect(registry.connect(stranger).cleanupExpiredAccess(docHash, grantee.address))
        .to.be.revertedWith("Access not yet expired");

      await time.increaseTo(expiration + 1);

      await expect(registry.connect(stranger).cleanupExpiredAccess(docHash, grantee.address))
        .to.emit(registry, "AccessExpired")
        .withArgs(docHash, grantee.address);

      const [, , , isActive] = await registry.getUserAccess(docHash, grantee.address);
      expect(isActive).to.equal(false);
    });
  });

  describe("document listings", function () {
    it("getUserDocuments returns owned documents", async function () {
      const { registry, owner, docHash } = await loadFixture(storedDocumentFixture);
      expect(await registry.getUserDocuments(owner.address)).to.deep.equal([docHash]);
      expect(await registry.getUserDocumentCount(owner.address)).to.equal(1n);
    });

    it("getDocumentAccessList is owner-only", async function () {
      const { registry, stranger, docHash } = await loadFixture(storedDocumentFixture);
      await expect(registry.connect(stranger).getDocumentAccessList(docHash))
        .to.be.revertedWith("Only owner can view access list");
    });
  });
});
