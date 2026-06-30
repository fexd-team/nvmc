const fs = require('fs');
const path = require('path');

function ensurePnpmShim(options) {
  const opts = options || {};
  const platform = opts.platform || process.platform;
  const arch = opts.arch || process.arch;
  const dir = path.join(
    opts.cacheRoot,
    'shims',
    'node-' + opts.nodeVersion,
    'pnpm-' + opts.pnpmVersion,
    platform + '-' + arch
  );

  fs.mkdirSync(dir, { recursive: true });

  if (platform === 'win32') {
    const command = path.join(dir, 'pnpm.cmd');
    const content = [
      '@echo off',
      '"' + opts.nodePath + '" "' + opts.pnpmCliPath + '" %*',
      ''
    ].join('\r\n');

    fs.writeFileSync(command, content, 'utf8');
    return { dir, command };
  }

  const command = path.join(dir, 'pnpm');
  const content = [
    '#!/bin/sh',
    "exec " + shellQuote(opts.nodePath) + " " + shellQuote(opts.pnpmCliPath) + ' "$@"',
    ''
  ].join('\n');

  fs.writeFileSync(command, content, { encoding: 'utf8', mode: 0o755 });
  try {
    fs.chmodSync(command, 0o755);
  } catch (error) {
    // Best effort on filesystems that do not support POSIX modes.
  }

  return { dir, command };
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function buildToolchainPath(options) {
  const opts = options || {};
  const delimiter = opts.delimiter || path.delimiter;
  const segments = [opts.shimDir, opts.nodeBinDir, opts.currentPath].filter(Boolean);
  return segments.join(delimiter);
}

module.exports = {
  ensurePnpmShim,
  buildToolchainPath
};
