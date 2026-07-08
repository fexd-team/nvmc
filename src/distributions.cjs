const DEFAULT_NODE_MIRROR = 'https://nodejs.org/dist';
const DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org';

function normalizeNodeVersion(version) {
  const clean = String(version || '').trim();
  return clean.startsWith('v') ? clean.slice(1) : clean;
}

function mapNodeArch(arch) {
  if (arch === 'x64' || arch === 'arm64') {
    return arch;
  }

  throw new Error('Unsupported CPU architecture for Node.js downloads: ' + arch);
}

function getNodeDistribution(options) {
  const version = normalizeNodeVersion(options.version);
  const platform = options.platform || process.platform;
  const arch = mapNodeArch(options.arch || process.arch);
  const mirror = (options.mirror || process.env.NVMC_NODE_MIRROR || DEFAULT_NODE_MIRROR).replace(/\/+$/, '');

  if (!version) {
    throw new Error('Node.js version is required');
  }

  let platformPart;
  let extension;

  if (platform === 'win32') {
    platformPart = 'win';
    extension = 'zip';
  } else if (platform === 'darwin') {
    platformPart = 'darwin';
    extension = 'tar.gz';
  } else if (platform === 'linux') {
    platformPart = 'linux';
    extension = 'tar.xz';
  } else {
    throw new Error('Unsupported platform for Node.js downloads: ' + platform);
  }

  const folderName = 'node-v' + version + '-' + platformPart + '-' + arch;
  const fileName = folderName + '.' + extension;

  return {
    version,
    platform,
    arch,
    fileName,
    folderName,
    url: mirror + '/v' + version + '/' + fileName
  };
}

function getNodeExecutableRelativePath(distribution) {
  return distribution.platform === 'win32' ? 'node.exe' : 'bin/node';
}

function getPnpmDistribution(version, registry) {
  const cleanVersion = String(version || '').trim();
  const cleanRegistry = (registry || process.env.NVMC_NPM_REGISTRY || DEFAULT_NPM_REGISTRY).replace(/\/+$/, '');

  if (!cleanVersion) {
    throw new Error('pnpm version is required');
  }

  return {
    version: cleanVersion,
    fileName: 'pnpm-' + cleanVersion + '.tgz',
    folderName: 'package',
    url: cleanRegistry + '/pnpm/-/pnpm-' + cleanVersion + '.tgz',
    executableRelativePath: 'package/bin/pnpm.cjs'
  };
}

module.exports = {
  getNodeDistribution,
  getNodeExecutableRelativePath,
  getPnpmDistribution
};
