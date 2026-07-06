/**
 * Backend integration tests: real Express app + real DocumentRegistry contract
 * on a local hardhat node, with a fake IPFS storage service injected.
 *
 * Requires contracts to be compiled first (`npx hardhat compile` at the repo
 * root); the root `npm test` script guarantees this ordering.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { ethers } from 'ethers';

import { createApp } from '../src/app.js';
import { createAuthService } from '../src/auth.js';
import { createChainService } from '../src/chain.js';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const RPC_PORT = 8546; // avoid clashing with a dev hardhat node on 8545
const RPC_URL = `http://127.0.0.1:${RPC_PORT}`;
const CHAIN_ID = 31337;
const JWT_SECRET = 'test-secret-for-integration-tests-only';

// Hardhat's well-known default accounts
const OWNER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const GRANTEE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const STRANGER_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';

const VIEW_ONLY = 1;
const FULL_ACCESS = 2;

const ENCRYPTED_FILE = Buffer.from('fake-encrypted-document-bytes');

function fakeWrappedKey() {
  return ethers.concat(['0x01', ethers.randomBytes(93)]);
}

function scopedHash(ownerAddress, label) {
  const fileHash = ethers.keccak256(ethers.toUtf8Bytes(label));
  return ethers.keccak256(ethers.solidityPacked(['address', 'bytes32'], [ownerAddress, fileHash]));
}

function createFakeStorage() {
  const uploads = [];
  return {
    uploads,
    testConnection: async () => ({ authenticated: true }),
    uploadFile: async ({ fileName, keyvalues }) => {
      uploads.push({ fileName, keyvalues });
      return { cid: 'QmFakeCid', size: 123, timestamp: new Date().toISOString() };
    },
    fetchByCid: async (cid) => (cid === 'QmFakeCid' ? ENCRYPTED_FILE : null),
    listFiles: async () => ({ files: [], count: 0 }),
    unpin: async () => {},
    getUsage: async () => null,
  };
}

async function waitForRpc(url, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      });
      if (res.ok) return;
    } catch {
      // node not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Hardhat node did not start on ${url}`);
}

/** Run the full nonce -> sign -> verify handshake and return a Bearer token. */
async function login(app, wallet) {
  const nonceRes = await request(app)
    .post('/api/auth/nonce')
    .send({ address: wallet.address });
  assert.strictEqual(nonceRes.status, 200, JSON.stringify(nonceRes.body));

  const signature = await wallet.signMessage(nonceRes.body.message);
  const verifyRes = await request(app)
    .post('/api/auth/verify')
    .send({ address: wallet.address, signature });
  assert.strictEqual(verifyRes.status, 200, JSON.stringify(verifyRes.body));
  return verifyRes.body.token;
}

describe('Backend API integration', () => {
  let hardhatNode;
  let provider;
  let registry;
  let app;
  let fakeStorage;
  let owner, grantee, stranger;
  let docHash;

  before(async () => {
    // 1. Spawn a local hardhat node
    hardhatNode = spawn('npx', ['hardhat', 'node', '--port', String(RPC_PORT)], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    await waitForRpc(RPC_URL);

    // cacheTimeout: -1 disables ethers' ~250ms RPC result cache — with
    // hardhat's instant automining, a cached eth_getTransactionCount
    // otherwise produces stale nonces for back-to-back transactions.
    provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { polling: true, cacheTimeout: -1 });
    provider.pollingInterval = 100;

    owner = new ethers.Wallet(OWNER_KEY, provider);
    grantee = new ethers.Wallet(GRANTEE_KEY, provider);
    stranger = new ethers.Wallet(STRANGER_KEY, provider);

    // 2. Deploy DocumentRegistry from the compiled artifact
    const artifact = require(path.join(
      repoRoot,
      'artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json'
    ));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, owner);
    registry = await factory.deploy();
    await registry.waitForDeployment();

    // 3. Store a document owned by `owner`
    docHash = scopedHash(owner.address, 'integration test doc');
    await (await registry.storeDocument(docHash, 'QmFakeCid', 'test.pdf', fakeWrappedKey())).wait();

    // 4. Build the app: real chain service, fake storage
    fakeStorage = createFakeStorage();
    app = createApp({
      authService: createAuthService({ jwtSecret: JWT_SECRET, chainId: CHAIN_ID }),
      chainService: createChainService({
        rpcUrl: RPC_URL,
        contractAddress: await registry.getAddress(),
      }),
      storageService: fakeStorage,
    });
  });

  after(async () => {
    provider?.destroy();
    hardhatNode?.kill('SIGTERM');
  });

  describe('authentication', () => {
    it('issues a token for a valid signature', async () => {
      const token = await login(app, owner);
      assert.ok(token);
    });

    it('rejects a signature from the wrong wallet', async () => {
      const nonceRes = await request(app).post('/api/auth/nonce').send({ address: owner.address });
      const signature = await stranger.signMessage(nonceRes.body.message);
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ address: owner.address, signature });
      assert.strictEqual(res.status, 401);
    });

    it('rejects nonce reuse', async () => {
      const nonceRes = await request(app).post('/api/auth/nonce').send({ address: owner.address });
      const signature = await owner.signMessage(nonceRes.body.message);

      const first = await request(app)
        .post('/api/auth/verify')
        .send({ address: owner.address, signature });
      assert.strictEqual(first.status, 200);

      const second = await request(app)
        .post('/api/auth/verify')
        .send({ address: owner.address, signature });
      assert.strictEqual(second.status, 401);
    });

    it('rejects invalid addresses and garbage tokens', async () => {
      const badAddr = await request(app).post('/api/auth/nonce').send({ address: 'not-an-address' });
      assert.strictEqual(badAddr.status, 400);

      const garbage = await request(app)
        .get(`/api/documents/${docHash}/content`)
        .set('Authorization', 'Bearer garbage');
      assert.strictEqual(garbage.status, 401);

      const missing = await request(app).get(`/api/documents/${docHash}/content`);
      assert.strictEqual(missing.status, 401);
    });
  });

  describe('document retrieval enforcement', () => {
    it('serves the file to the owner', async () => {
      const token = await login(app, owner);
      const res = await request(app)
        .get(`/api/documents/${docHash}/content`)
        .set('Authorization', `Bearer ${token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.accessLevel, 'owner');
      assert.strictEqual(Buffer.from(res.body.data, 'base64').toString(), ENCRYPTED_FILE.toString());
      assert.strictEqual(res.body.fileName, 'test.pdf');
    });

    it('denies a stranger with no grant', async () => {
      const token = await login(app, stranger);
      const res = await request(app)
        .get(`/api/documents/${docHash}/content`)
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(res.status, 403);
    });

    it('serves a granted user, then denies after revocation', async () => {
      await (await registry.grantAccess(docHash, grantee.address, FULL_ACCESS, 0, fakeWrappedKey())).wait();

      const token = await login(app, grantee);
      const granted = await request(app)
        .get(`/api/documents/${docHash}/content`)
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(granted.status, 200);
      assert.strictEqual(granted.body.accessLevel, 'full_access');

      await (await registry.revokeAccess(docHash, grantee.address)).wait();

      const revoked = await request(app)
        .get(`/api/documents/${docHash}/content`)
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(revoked.status, 403);
    });

    it('denies access after on-chain expiration', async () => {
      const block = await provider.getBlock('latest');
      const expiration = block.timestamp + 3600;
      await (await registry.grantAccess(docHash, grantee.address, VIEW_ONLY, expiration, fakeWrappedKey())).wait();

      const token = await login(app, grantee);
      const fresh = await request(app)
        .get(`/api/documents/${docHash}/content`)
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(fresh.status, 200);
      assert.strictEqual(fresh.body.accessLevel, 'view_only');

      // Jump past the expiration on-chain
      await provider.send('evm_increaseTime', [3700]);
      await provider.send('evm_mine', []);

      const expired = await request(app)
        .get(`/api/documents/${docHash}/content`)
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(expired.status, 403);
    });

    it('404s for unknown documents and bad hash formats', async () => {
      const token = await login(app, owner);

      const unknown = await request(app)
        .get(`/api/documents/${ethers.keccak256(ethers.toUtf8Bytes('nope'))}/content`)
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(unknown.status, 404);

      const malformed = await request(app)
        .get('/api/documents/not-a-hash/content')
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(malformed.status, 400);
    });

    it('the old raw-CID retrieval route is gone', async () => {
      const token = await login(app, owner);
      const res = await request(app)
        .get('/api/ipfs/retrieve/QmFakeCid')
        .set('Authorization', `Bearer ${token}`);
      assert.strictEqual(res.status, 404);
    });

    it('the old anonymous token route is gone', async () => {
      const res = await request(app).post('/api/auth/token').send({});
      assert.strictEqual(res.status, 404);
    });
  });

  describe('access validation', () => {
    it('reports real on-chain access for the owner', async () => {
      const token = await login(app, owner);
      const res = await request(app)
        .post('/api/access/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({ documentHash: docHash });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.isValid, true);
      assert.strictEqual(res.body.isOwner, true);
      assert.strictEqual(res.body.level, 'owner');
    });

    it('reports no access for a stranger', async () => {
      const token = await login(app, stranger);
      const res = await request(app)
        .post('/api/access/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({ documentHash: docHash });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.isValid, false);
      assert.strictEqual(res.body.level, 'none');
    });
  });

  describe('upload', () => {
    it('stamps the owner from the verified JWT, ignoring client claims', async () => {
      const token = await login(app, owner);
      const res = await request(app)
        .post('/api/ipfs/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('ownerAddress', stranger.address) // attacker-controlled, must be ignored
        .attach('file', Buffer.from('ciphertext'), 'doc.bin');

      assert.strictEqual(res.status, 200);
      const upload = fakeStorage.uploads.at(-1);
      assert.strictEqual(upload.keyvalues.ownerAddress, owner.address.toLowerCase());
    });
  });
});
