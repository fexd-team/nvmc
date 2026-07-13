const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureNode, ensurePnpm, extractArchive } = require('../src/install.cjs');

function tempCache() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nvmc-cache-'));
  return {
    root,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true })
  };
}

test('ensureNode downloads and extracts Node.js when the cached executable is missing', async () => {
  const cache = tempCache();
  const events = [];

  try {
    const result = await ensureNode({
      version: '20.19.5',
      cacheRoot: cache.root,
      platform: 'win32',
      arch: 'x64',
      downloadFile: (url, destination) => {
        events.push(['download', url, path.basename(destination)]);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, 'archive');
      },
      extractArchive: (archive, destination) => {
        events.push(['extract', path.basename(archive), destination]);
        const tempNodePath = path.join(destination, 'node-v20.19.5-win-x64', 'node.exe');
        fs.mkdirSync(path.dirname(tempNodePath), { recursive: true });
        fs.writeFileSync(tempNodePath, '');
      }
    });

    assert.strictEqual(path.basename(result.executablePath), 'node.exe');
    assert.strictEqual(events[0][0], 'download');
    assert.strictEqual(events[0][1], 'https://nodejs.org/dist/v20.19.5/node-v20.19.5-win-x64.zip');
    assert.ok(events[0][2].indexOf('node-v20.19.5-win-x64.zip.tmp-') === 0);
    assert.strictEqual(events[1][0], 'extract');
  } finally {
    cache.cleanup();
  }
});

test('ensureNode downloads to a temporary archive before publishing the cache file', async () => {
  const cache = tempCache();
  const events = [];
  const finalArchive = path.join(cache.root, 'downloads', 'node-v20.19.5-darwin-arm64.tar.gz');

  try {
    await ensureNode({
      version: '20.19.5',
      cacheRoot: cache.root,
      platform: 'darwin',
      arch: 'arm64',
      downloadFile: async (url, destination) => {
        events.push(['download', path.basename(destination), fs.existsSync(finalArchive)]);
        assert.notStrictEqual(destination, finalArchive);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, 'archive');
      },
      extractArchive: async (archive, destination) => {
        events.push(['extract', archive, destination]);
        assert.strictEqual(archive, finalArchive);
        const tempNodePath = path.join(destination, 'node-v20.19.5-darwin-arm64', 'bin', 'node');
        fs.mkdirSync(path.dirname(tempNodePath), { recursive: true });
        fs.writeFileSync(tempNodePath, '');
      }
    });

    assert.strictEqual(fs.existsSync(finalArchive), true);
    assert.deepStrictEqual(events[0], ['download', path.basename(events[0][1]), false]);
    assert.ok(events[0][1].indexOf('node-v20.19.5-darwin-arm64.tar.gz.tmp-') === 0);
  } finally {
    cache.cleanup();
  }
});

test('ensureNode removes bad archives and partial install directories after extract failures', async () => {
  const cache = tempCache();
  const finalArchive = path.join(cache.root, 'downloads', 'node-v20.19.5-darwin-arm64.tar.gz');
  let downloads = 0;

  try {
    await assert.rejects(
      ensureNode({
        version: '20.19.5',
        cacheRoot: cache.root,
        platform: 'darwin',
        arch: 'arm64',
        lockRetryMs: 1,
        downloadFile: async (url, destination) => {
          downloads += 1;
          fs.mkdirSync(path.dirname(destination), { recursive: true });
          fs.writeFileSync(destination, 'bad archive');
        },
        extractArchive: async (archive, destination) => {
          fs.mkdirSync(path.join(destination, 'node-v20.19.5-darwin-arm64'), { recursive: true });
          throw new Error('bad gzip');
        }
      }),
      /bad gzip/
    );

    assert.strictEqual(downloads, 2);
    assert.strictEqual(fs.existsSync(finalArchive), false);
    assert.strictEqual(fs.existsSync(resultPathDarwin(cache.root)), false);
    assert.deepStrictEqual(findPathFragments(cache.root, '.tmp-'), []);
    assert.deepStrictEqual(findPathFragments(cache.root, '.lock'), []);
  } finally {
    cache.cleanup();
  }
});

test('ensurePnpm downloads and extracts pnpm when the cached CLI is missing', async () => {
  const cache = tempCache();
  const events = [];

  try {
    const result = await ensurePnpm({
      version: '9.15.9',
      cacheRoot: cache.root,
      downloadFile: (url, destination) => {
        events.push(['download', url, path.basename(destination)]);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, 'archive');
      },
      extractArchive: (archive, destination) => {
        events.push(['extract', path.basename(archive), destination]);
        const tempPnpmPath = path.join(destination, 'package', 'bin', 'pnpm.cjs');
        fs.mkdirSync(path.dirname(tempPnpmPath), { recursive: true });
        fs.writeFileSync(tempPnpmPath, '');
      }
    });

    assert.strictEqual(result.executablePath, resultPathPnpm(cache.root));
    assert.strictEqual(events[0][0], 'download');
    assert.strictEqual(events[0][1], 'https://registry.npmjs.org/pnpm/-/pnpm-9.15.9.tgz');
    assert.ok(events[0][2].indexOf('pnpm-9.15.9.tgz.tmp-') === 0);
    assert.strictEqual(events[1][0], 'extract');
  } finally {
    cache.cleanup();
  }
});

test('ensurePnpm serializes concurrent installs for the same version', async () => {
  const cache = tempCache();
  let downloads = 0;
  let extracts = 0;

  try {
    const installOptions = {
      version: '9.15.9',
      cacheRoot: cache.root,
      lockRetryMs: 1,
      downloadFile: async (url, destination) => {
        downloads += 1;
        await delay(25);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, 'archive');
      },
      extractArchive: async (archive, destination) => {
        extracts += 1;
        await delay(25);
        fs.mkdirSync(path.dirname(path.join(destination, 'package', 'bin', 'pnpm.cjs')), { recursive: true });
        fs.writeFileSync(path.join(destination, 'package', 'bin', 'pnpm.cjs'), '');
      }
    };

    const results = await Promise.all([
      ensurePnpm(installOptions),
      ensurePnpm(installOptions)
    ]);

    assert.strictEqual(downloads, 1);
    assert.strictEqual(extracts, 1);
    assert.strictEqual(results[0].executablePath, resultPathPnpm(cache.root));
    assert.strictEqual(results[1].executablePath, resultPathPnpm(cache.root));
    assert.strictEqual(results.filter((item) => item.reused).length, 1);
  } finally {
    cache.cleanup();
  }
});

test('extractArchive uses the Windows system tar instead of PATH tar on Windows', () => {
  const cache = tempCache();
  const calls = [];

  try {
    extractArchive('C:\\cache\\archive.zip', cache.root, {
      platform: 'win32',
      env: { SystemRoot: 'C:\\Windows' },
      spawnSync: (command, args, options) => {
        calls.push({ command, args, options });
        return { status: 0 };
      }
    });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].command, 'C:\\Windows\\System32\\tar.exe');
    assert.deepStrictEqual(calls[0].args, ['-xf', 'C:\\cache\\archive.zip', '-C', cache.root]);
    assert.strictEqual(calls[0].options.stdio, 'inherit');
  } finally {
    cache.cleanup();
  }
});

function resultPath(cacheRoot) {
  return path.join(cacheRoot, 'node', '20.19.5', 'win32-x64', 'node-v20.19.5-win-x64', 'node.exe');
}

function resultPathDarwin(cacheRoot) {
  return path.join(cacheRoot, 'node', '20.19.5', 'darwin-arm64', 'node-v20.19.5-darwin-arm64', 'bin', 'node');
}

function resultPathPnpm(cacheRoot) {
  return path.join(cacheRoot, 'pnpm', '9.15.9', 'package', 'bin', 'pnpm.cjs');
}

function findPathFragments(root, fragment) {
  const results = [];

  function visit(current) {
    if (!fs.existsSync(current)) {
      return;
    }

    if (current.indexOf(fragment) >= 0) {
      results.push(path.relative(root, current));
    }

    const stat = fs.lstatSync(current);
    if (!stat.isDirectory()) {
      return;
    }

    for (const entry of fs.readdirSync(current)) {
      visit(path.join(current, entry));
    }
  }

  visit(root);
  return results.sort();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
