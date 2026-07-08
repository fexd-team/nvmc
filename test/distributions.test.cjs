const assert = require('assert');
const {
  getNodeDistribution,
  getNodeExecutableRelativePath,
  getPnpmDistribution
} = require('../src/distributions.cjs');

test('builds the Windows x64 Node.js distribution metadata', () => {
  const dist = getNodeDistribution({
    version: '20.19.5',
    platform: 'win32',
    arch: 'x64'
  });

  assert.strictEqual(dist.fileName, 'node-v20.19.5-win-x64.zip');
  assert.strictEqual(dist.folderName, 'node-v20.19.5-win-x64');
  assert.strictEqual(dist.url, 'https://nodejs.org/dist/v20.19.5/node-v20.19.5-win-x64.zip');
  assert.strictEqual(getNodeExecutableRelativePath(dist), 'node.exe');
});

test('builds the macOS arm64 Node.js distribution metadata', () => {
  const dist = getNodeDistribution({
    version: '20.19.5',
    platform: 'darwin',
    arch: 'arm64'
  });

  assert.strictEqual(dist.fileName, 'node-v20.19.5-darwin-arm64.tar.gz');
  assert.strictEqual(dist.folderName, 'node-v20.19.5-darwin-arm64');
  assert.strictEqual(dist.url, 'https://nodejs.org/dist/v20.19.5/node-v20.19.5-darwin-arm64.tar.gz');
  assert.strictEqual(getNodeExecutableRelativePath(dist), 'bin/node');
});

test('builds the pnpm package distribution metadata', () => {
  const dist = getPnpmDistribution('9.15.9');

  assert.strictEqual(dist.fileName, 'pnpm-9.15.9.tgz');
  assert.strictEqual(dist.folderName, 'package');
  assert.strictEqual(dist.url, 'https://registry.npmjs.org/pnpm/-/pnpm-9.15.9.tgz');
  assert.strictEqual(dist.executableRelativePath, 'package/bin/pnpm.cjs');
});

test('uses NVMC mirror environment variables for downloads', () => {
  const previousNodeMirror = process.env.NVMC_NODE_MIRROR;
  const previousRegistry = process.env.NVMC_NPM_REGISTRY;

  try {
    process.env.NVMC_NODE_MIRROR = 'https://mirror.example/node/';
    process.env.NVMC_NPM_REGISTRY = 'https://mirror.example/npm/';

    const nodeDist = getNodeDistribution({
      version: '20.19.5',
      platform: 'linux',
      arch: 'x64'
    });
    const pnpmDist = getPnpmDistribution('9.15.9');

    assert.strictEqual(nodeDist.url, 'https://mirror.example/node/v20.19.5/node-v20.19.5-linux-x64.tar.xz');
    assert.strictEqual(pnpmDist.url, 'https://mirror.example/npm/pnpm/-/pnpm-9.15.9.tgz');
  } finally {
    if (previousNodeMirror === undefined) {
      delete process.env.NVMC_NODE_MIRROR;
    } else {
      process.env.NVMC_NODE_MIRROR = previousNodeMirror;
    }

    if (previousRegistry === undefined) {
      delete process.env.NVMC_NPM_REGISTRY;
    } else {
      process.env.NVMC_NPM_REGISTRY = previousRegistry;
    }
  }
});
