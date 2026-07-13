const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const childProcess = require('child_process');
const { getNodeDistribution, getPnpmDistribution } = require('./distributions.cjs');
const { getNodePaths, getPnpmPaths } = require('./cache.cjs');

const INSTALL_RETRIES = 2;
const LOCK_RETRY_MS = 100;
const LOCK_STALE_MS = 10 * 60 * 1000;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

async function ensureNode(options) {
  const opts = options || {};
  const distribution = getNodeDistribution({
    version: opts.version,
    platform: opts.platform,
    arch: opts.arch
  });
  const paths = getNodePaths(opts.cacheRoot, distribution);

  if (fs.existsSync(paths.executablePath)) {
    return {
      distribution,
      executablePath: paths.executablePath,
      installDir: paths.installDir,
      reused: true
    };
  }

  const result = await withInstallLock(opts.cacheRoot, 'node-' + distribution.version + '-' + distribution.platform + '-' + distribution.arch, opts, async () => {
    if (fs.existsSync(paths.executablePath)) {
      return { reused: true };
    }

    await installNodeDistribution({
      distribution,
      paths,
      cacheRoot: opts.cacheRoot,
      downloadFile: opts.downloadFile || downloadFile,
      extractArchive: opts.extractArchive || extractArchive
    });

    return { reused: false };
  });

  return {
    distribution,
    executablePath: paths.executablePath,
    installDir: paths.installDir,
    reused: result.reused
  };
}

async function ensurePnpm(options) {
  const opts = options || {};
  const distribution = getPnpmDistribution(opts.version);
  const paths = getPnpmPaths(opts.cacheRoot, distribution.version);

  if (fs.existsSync(paths.executablePath)) {
    return {
      distribution,
      executablePath: paths.executablePath,
      installDir: paths.installDir,
      reused: true
    };
  }

  const result = await withInstallLock(opts.cacheRoot, 'pnpm-' + distribution.version, opts, async () => {
    if (fs.existsSync(paths.executablePath)) {
      return { reused: true };
    }

    await installPnpmDistribution({
      distribution,
      paths,
      cacheRoot: opts.cacheRoot,
      downloadFile: opts.downloadFile || downloadFile,
      extractArchive: opts.extractArchive || extractArchive
    });

    return { reused: false };
  });

  return {
    distribution,
    executablePath: paths.executablePath,
    installDir: paths.installDir,
    reused: result.reused
  };
}

function downloadFile(url, destination) {
  const client = url.startsWith('https:') ? https : http;

  return new Promise((resolve, reject) => {
    let settled = false;

    function fail(error) {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    }

    const request = client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        downloadFile(response.headers.location, destination).then(() => {
          if (!settled) {
            settled = true;
            resolve();
          }
        }, fail);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        fail(new Error('Download failed with HTTP ' + response.statusCode + ': ' + url));
        return;
      }

      const expectedLength = parseContentLength(response.headers['content-length']);
      let receivedLength = 0;

      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const stream = fs.createWriteStream(destination);
      response.on('data', (chunk) => {
        receivedLength += chunk.length;
      });
      response.on('error', fail);
      response.pipe(stream);
      stream.on('finish', () => {
        stream.close(() => {
          if (settled) {
            return;
          }

          if (typeof expectedLength === 'number' && expectedLength !== receivedLength) {
            fail(new Error('Download size mismatch for ' + url + ': expected ' + expectedLength + ' bytes, received ' + receivedLength + ' bytes'));
            return;
          }

          settled = true;
          resolve();
        });
      });
      stream.on('error', fail);
    });

    request.on('error', fail);
  });
}

async function installNodeDistribution(options) {
  const opts = options || {};
  const archivePath = path.join(opts.cacheRoot, 'downloads', opts.distribution.fileName);
  const finalParentDir = path.dirname(opts.paths.installDir);

  await installWithArchive({
    name: 'Node.js',
    url: opts.distribution.url,
    archivePath,
    executablePath: opts.paths.executablePath,
    finalInstallDir: opts.paths.installDir,
    downloadFile: opts.downloadFile,
    installFromArchive: async (archive) => {
      const tempRoot = uniqueSiblingPath(path.join(finalParentDir, '.tmp-' + opts.distribution.folderName));

      try {
        fs.mkdirSync(tempRoot, { recursive: true });
        await opts.extractArchive(archive, tempRoot);

        const tempInstallDir = path.join(tempRoot, path.basename(opts.paths.installDir));
        const tempExecutablePath = path.join(tempInstallDir, path.relative(opts.paths.installDir, opts.paths.executablePath));

        if (!fs.existsSync(tempExecutablePath)) {
          throw new Error('Node.js install did not produce expected executable: ' + tempExecutablePath);
        }

        replaceDirectory(tempInstallDir, opts.paths.installDir);
      } finally {
        removePath(tempRoot);
      }
    }
  });
}

async function installPnpmDistribution(options) {
  const opts = options || {};
  const archivePath = path.join(opts.cacheRoot, 'downloads', opts.distribution.fileName);

  await installWithArchive({
    name: 'pnpm',
    url: opts.distribution.url,
    archivePath,
    executablePath: opts.paths.executablePath,
    finalInstallDir: opts.paths.installDir,
    downloadFile: opts.downloadFile,
    installFromArchive: async (archive) => {
      const tempInstallDir = uniqueSiblingPath(path.join(path.dirname(opts.paths.installDir), '.tmp-pnpm-' + opts.distribution.version));

      try {
        fs.mkdirSync(tempInstallDir, { recursive: true });
        await opts.extractArchive(archive, tempInstallDir);

        const tempExecutablePath = path.join(tempInstallDir, path.relative(opts.paths.installDir, opts.paths.executablePath));

        if (!fs.existsSync(tempExecutablePath)) {
          throw new Error('pnpm install did not produce expected CLI: ' + tempExecutablePath);
        }

        replaceDirectory(tempInstallDir, opts.paths.installDir);
      } finally {
        removePath(tempInstallDir);
      }
    }
  });
}

async function installWithArchive(options) {
  const opts = options || {};
  let lastError;

  for (let attempt = 0; attempt < INSTALL_RETRIES; attempt += 1) {
    try {
      await ensureArchive({
        url: opts.url,
        archivePath: opts.archivePath,
        downloadFile: opts.downloadFile
      });

      if (fs.existsSync(opts.finalInstallDir) && !fs.existsSync(opts.executablePath)) {
        removePath(opts.finalInstallDir);
      }

      await opts.installFromArchive(opts.archivePath);

      if (!fs.existsSync(opts.executablePath)) {
        throw new Error(opts.name + ' install did not produce expected executable: ' + opts.executablePath);
      }

      return;
    } catch (error) {
      lastError = error;
      removePath(opts.finalInstallDir);
      removePath(opts.archivePath);

      if (attempt + 1 >= INSTALL_RETRIES) {
        throw lastError;
      }
    }
  }
}

async function ensureArchive(options) {
  const opts = options || {};

  if (fs.existsSync(opts.archivePath) && fs.statSync(opts.archivePath).size > 0) {
    return;
  }

  removePath(opts.archivePath);
  fs.mkdirSync(path.dirname(opts.archivePath), { recursive: true });

  const tempArchivePath = uniqueSiblingPath(opts.archivePath);

  try {
    await opts.downloadFile(opts.url, tempArchivePath);

    if (!fs.existsSync(tempArchivePath) || fs.statSync(tempArchivePath).size <= 0) {
      throw new Error('Download did not produce a non-empty archive: ' + opts.url);
    }

    removePath(opts.archivePath);
    fs.renameSync(tempArchivePath, opts.archivePath);
  } catch (error) {
    removePath(tempArchivePath);
    throw error;
  }
}

async function withInstallLock(cacheRoot, name, options, fn) {
  const lockDir = path.join(cacheRoot, 'locks', sanitizeLockName(name) + '.lock');
  const release = await acquireInstallLock(lockDir, options || {});

  try {
    return await fn();
  } finally {
    release();
  }
}

async function acquireInstallLock(lockDir, options) {
  const retryMs = options.lockRetryMs || LOCK_RETRY_MS;
  const staleMs = options.lockStaleMs || LOCK_STALE_MS;
  const timeoutMs = options.lockTimeoutMs || LOCK_TIMEOUT_MS;
  const startedAt = Date.now();

  fs.mkdirSync(path.dirname(lockDir), { recursive: true });

  while (true) {
    try {
      fs.mkdirSync(lockDir);
      writeLockInfo(lockDir);
      return () => removePath(lockDir);
    } catch (error) {
      if (!error || error.code !== 'EEXIST') {
        throw error;
      }

      if (isStaleLock(lockDir, staleMs)) {
        removePath(lockDir);
        continue;
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error('Timed out waiting for nvmc install lock: ' + lockDir);
      }

      await delay(retryMs);
    }
  }
}

function writeLockInfo(lockDir) {
  const content = JSON.stringify({
    pid: process.pid,
    createdAt: new Date().toISOString()
  });

  try {
    fs.writeFileSync(path.join(lockDir, 'owner.json'), content, 'utf8');
  } catch (error) {
    // The lock directory itself is the synchronization primitive.
  }
}

function isStaleLock(lockDir, staleMs) {
  try {
    const info = readLockInfo(lockDir);
    if (info && info.pid && isProcessAlive(info.pid)) {
      return false;
    }

    const stat = fs.statSync(lockDir);
    return Date.now() - stat.mtimeMs > staleMs;
  } catch (error) {
    return false;
  }
}

function readLockInfo(lockDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(lockDir, 'owner.json'), 'utf8'));
  } catch (error) {
    return null;
  }
}

function isProcessAlive(pid) {
  if (pid === process.pid) {
    return true;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function replaceDirectory(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  removePath(destination);
  fs.renameSync(source, destination);
}

function uniqueSiblingPath(basePath) {
  return basePath + '.tmp-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function sanitizeLockName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function parseContentLength(value) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removePath(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }

  if (typeof fs.rmSync === 'function') {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return;
  }

  const stat = fs.lstatSync(targetPath);

  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fs.unlinkSync(targetPath);
    return;
  }

  for (const entry of fs.readdirSync(targetPath)) {
    removePath(path.join(targetPath, entry));
  }

  fs.rmdirSync(targetPath);
}

function extractArchive(archivePath, destination, options) {
  const opts = options || {};
  fs.mkdirSync(destination, { recursive: true });

  const spawn = opts.spawnSync || childProcess.spawnSync;
  const result = spawn(getTarCommand(opts), ['-xf', archivePath, '-C', destination], {
    stdio: 'inherit'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error('Failed to extract archive: ' + archivePath);
  }
}

function getTarCommand(options) {
  const opts = options || {};
  const platform = opts.platform || process.platform;

  if (platform !== 'win32') {
    return 'tar';
  }

  const env = opts.env || process.env;
  const systemRoot = env.SystemRoot || env.SYSTEMROOT || 'C:\\Windows';
  return path.win32.join(systemRoot, 'System32', 'tar.exe');
}

module.exports = {
  ensureNode,
  ensurePnpm,
  downloadFile,
  extractArchive,
  getTarCommand
};
