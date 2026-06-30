const assert = require('assert');
const path = require('path');
const {
  getDefaultCacheRoot,
  getNodePaths,
  getPnpmPaths
} = require('../src/cache.cjs');
const { getNodeDistribution } = require('../src/distributions.cjs');

test('uses LOCALAPPDATA for the default Windows cache root', () => {
  const cacheRoot = getDefaultCacheRoot({
    platform: 'win32',
    env: { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' },
    home: 'C:\\Users\\me'
  });

  assert.strictEqual(cacheRoot, path.join('C:\\Users\\me\\AppData\\Local', 'fexd-toolchain'));
});

test('uses Library/Caches for the default macOS cache root', () => {
  const cacheRoot = getDefaultCacheRoot({
    platform: 'darwin',
    env: {},
    home: '/Users/me'
  });

  assert.strictEqual(cacheRoot, path.join('/Users/me', 'Library', 'Caches', 'fexd-toolchain'));
});

test('builds Node.js cache paths without platform-specific shell shims', () => {
  const dist = getNodeDistribution({
    version: '20.19.5',
    platform: 'win32',
    arch: 'x64'
  });
  const paths = getNodePaths('C:\\cache', dist);

  assert.strictEqual(paths.installDir, path.join('C:\\cache', 'node', '20.19.5', 'win32-x64', 'node-v20.19.5-win-x64'));
  assert.strictEqual(paths.executablePath, path.join(paths.installDir, 'node.exe'));
});

test('builds pnpm cache paths for the package CLI entry', () => {
  const paths = getPnpmPaths('/cache', '9.15.9');

  assert.strictEqual(paths.installDir, path.join('/cache', 'pnpm', '9.15.9'));
  assert.strictEqual(paths.executablePath, path.join(paths.installDir, 'package', 'bin', 'pnpm.cjs'));
});
