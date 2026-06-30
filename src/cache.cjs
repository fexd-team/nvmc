const os = require('os');
const path = require('path');
const { getNodeExecutableRelativePath, getPnpmDistribution } = require('./distributions.cjs');

const CACHE_DIR_NAME = 'fexd-toolchain';

function getDefaultCacheRoot(options) {
  const opts = options || {};
  const platform = opts.platform || process.platform;
  const env = opts.env || process.env;
  const home = opts.home || os.homedir();

  if (env.TC_HOME) {
    return path.resolve(env.TC_HOME);
  }

  if (platform === 'win32') {
    return path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), CACHE_DIR_NAME);
  }

  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Caches', CACHE_DIR_NAME);
  }

  return path.join(env.XDG_CACHE_HOME || path.join(home, '.cache'), CACHE_DIR_NAME);
}

function getNodePaths(cacheRoot, distribution) {
  const installDir = path.join(
    cacheRoot,
    'node',
    distribution.version,
    distribution.platform + '-' + distribution.arch,
    distribution.folderName
  );

  return {
    installDir,
    executablePath: path.join(installDir, getNodeExecutableRelativePath(distribution))
  };
}

function getPnpmPaths(cacheRoot, version) {
  const distribution = getPnpmDistribution(version);
  const installDir = path.join(cacheRoot, 'pnpm', distribution.version);

  return {
    installDir,
    executablePath: path.join(installDir, distribution.executableRelativePath)
  };
}

module.exports = {
  getDefaultCacheRoot,
  getNodePaths,
  getPnpmPaths
};
