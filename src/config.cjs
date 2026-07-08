const fs = require('fs');
const path = require('path');
const { parseNpmrcText, updateNpmrcText } = require('./npmrc.cjs');

function parentOf(directory) {
  const parent = path.dirname(directory);
  return parent === directory ? null : parent;
}

function hasToolchainConfig(npmrcConfig) {
  return Boolean(npmrcConfig['nvmc-node'] || npmrcConfig['nvmc-pnpm']);
}

function findProjectRoot(startDirectory) {
  let current = path.resolve(startDirectory || process.cwd());
  let nearestPackageRoot = null;

  while (current) {
    const packageJsonPath = path.join(current, 'package.json');
    if (!nearestPackageRoot && fs.existsSync(packageJsonPath)) {
      nearestPackageRoot = current;
    }

    const npmrcPath = path.join(current, '.npmrc');
    if (fs.existsSync(npmrcPath)) {
      const npmrcConfig = parseNpmrcText(fs.readFileSync(npmrcPath, 'utf8'));
      if (hasToolchainConfig(npmrcConfig)) {
        return current;
      }
    }

    current = parentOf(current);
  }

  return nearestPackageRoot;
}

function readToolchainConfig(startDirectory) {
  const root = findProjectRoot(startDirectory);

  if (!root) {
    throw new Error('Could not find a package.json or .npmrc from ' + path.resolve(startDirectory || process.cwd()));
  }

  const npmrcPath = path.join(root, '.npmrc');
  const npmrcConfig = fs.existsSync(npmrcPath)
    ? parseNpmrcText(fs.readFileSync(npmrcPath, 'utf8'))
    : {};

  return {
    root,
    nodeVersion: npmrcConfig['nvmc-node'] || '',
    pnpmVersion: npmrcConfig['nvmc-pnpm'] || '',
    npmrcPath: fs.existsSync(npmrcPath) ? npmrcPath : null
  };
}

function writeToolchainConfig(startDirectory, options) {
  const root = findProjectRoot(startDirectory);

  if (!root) {
    throw new Error('Could not find a package.json or .npmrc from ' + path.resolve(startDirectory || process.cwd()));
  }

  const npmrcPath = path.join(root, '.npmrc');
  const currentText = fs.existsSync(npmrcPath)
    ? fs.readFileSync(npmrcPath, 'utf8')
    : '';
  const values = {};

  if (options.nodeVersion) {
    values['nvmc-node'] = options.nodeVersion;
  }

  if (options.pnpmVersion) {
    values['nvmc-pnpm'] = options.pnpmVersion;
  }

  fs.writeFileSync(npmrcPath, updateNpmrcText(currentText, values), 'utf8');

  return readToolchainConfig(root);
}

module.exports = {
  findProjectRoot,
  readToolchainConfig,
  writeToolchainConfig
};
