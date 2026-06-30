const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensurePnpmShim, buildToolchainPath } = require('../src/shims.cjs');

function tempCache() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-shims-'));
  return {
    root,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true })
  };
}

test('writes a Windows pnpm.cmd shim that invokes the pinned Node.js and pnpm CLI', () => {
  const cache = tempCache();

  try {
    const shim = ensurePnpmShim({
      cacheRoot: cache.root,
      nodeVersion: '20.19.5',
      pnpmVersion: '9.15.9',
      platform: 'win32',
      arch: 'x64',
      nodePath: 'C:\\cache\\node.exe',
      pnpmCliPath: 'C:\\cache\\pnpm.cjs'
    });

    const content = fs.readFileSync(path.join(shim.dir, 'pnpm.cmd'), 'utf8');

    assert.strictEqual(path.basename(shim.command), 'pnpm.cmd');
    assert.ok(content.indexOf('"C:\\cache\\node.exe" "C:\\cache\\pnpm.cjs" %*') >= 0);
  } finally {
    cache.cleanup();
  }
});

test('writes a Unix pnpm shim that invokes the pinned Node.js and pnpm CLI', () => {
  const cache = tempCache();

  try {
    const shim = ensurePnpmShim({
      cacheRoot: cache.root,
      nodeVersion: '20.19.5',
      pnpmVersion: '9.15.9',
      platform: 'darwin',
      arch: 'arm64',
      nodePath: '/cache/node',
      pnpmCliPath: '/cache/pnpm.cjs'
    });

    const content = fs.readFileSync(path.join(shim.dir, 'pnpm'), 'utf8');

    assert.strictEqual(path.basename(shim.command), 'pnpm');
    assert.ok(content.indexOf("exec '/cache/node' '/cache/pnpm.cjs' \"$@\"") >= 0);
  } finally {
    cache.cleanup();
  }
});

test('prepends the shim directory and Node.js bin directory to PATH', () => {
  const envPath = buildToolchainPath({
    currentPath: 'global-bin',
    shimDir: '/cache/shims',
    nodeBinDir: '/cache/node/bin',
    delimiter: ':'
  });

  assert.strictEqual(envPath, '/cache/shims:/cache/node/bin:global-bin');
});
