const path = require('path');
const childProcess = require('child_process');
const { readToolchainConfig } = require('./config.cjs');
const { getDefaultCacheRoot } = require('./cache.cjs');
const { ensureNode, ensurePnpm } = require('./install.cjs');
const { ensurePnpmShim, buildToolchainPath } = require('./shims.cjs');
const packageJson = require('../package.json');

async function runCli(argv, dependencies) {
  const deps = dependencies || {};
  const args = Array.isArray(argv) ? argv.slice() : [];
  const command = args.shift();
  const stdout = deps.stdout || process.stdout;
  const stderr = deps.stderr || process.stderr;
  const platform = deps.platform || process.platform;
  const arch = deps.arch || process.arch;
  const env = Object.assign({}, deps.env || process.env);
  const cwd = deps.cwd || process.cwd();

  if (command === '--version' || command === '-v' || command === 'version') {
    stdout.write(packageJson.version + '\n');
    return 0;
  }

  if (!command || command === '--help' || command === '-h') {
    stdout.write(usage());
    return 0;
  }

  if (command !== 'doctor' && command !== 'node' && command !== 'pnpm') {
    stderr.write('Unknown command: ' + command + '\n\n' + usage());
    return 1;
  }

  let config;
  try {
    config = (deps.readToolchainConfig || readToolchainConfig)(cwd);
  } catch (error) {
    stderr.write(formatError(error) + '\n');
    return 1;
  }

  if (command === 'doctor') {
    stdout.write([
      'Project: ' + config.root,
      'Config: ' + (config.npmrcPath || '(missing .npmrc)'),
      'Node.js: ' + (config.nodeVersion || '(missing nvmc-node)'),
      'pnpm: ' + (config.pnpmVersion || '(missing nvmc-pnpm)'),
      ''
    ].join('\n'));
    return config.nodeVersion && config.pnpmVersion ? 0 : 1;
  }

  if (!config.nodeVersion) {
    stderr.write('Missing nvmc-node in ' + (config.npmrcPath || 'project .npmrc') + '\n');
    return 1;
  }

  if (command === 'pnpm' && !config.pnpmVersion) {
    stderr.write('Missing nvmc-pnpm in ' + (config.npmrcPath || 'project .npmrc') + '\n');
    return 1;
  }

  const cacheRoot = (deps.getDefaultCacheRoot || getDefaultCacheRoot)({
    platform,
    env
  });

  try {
    const node = await (deps.ensureNode || ensureNode)({
      version: config.nodeVersion,
      cacheRoot,
      platform,
      arch
    });

    if (command === 'node') {
      stderr.write(formatAppliedVersions({ nodeVersion: config.nodeVersion }) + '\n');
      return spawnAndReturn({
        spawnSync: deps.spawnSync || childProcess.spawnSync,
        command: node.executablePath,
        args,
        cwd,
        env: withPath(env, path.dirname(node.executablePath), null, platform),
        stdio: deps.stdio || 'inherit'
      });
    }

    const pnpm = await (deps.ensurePnpm || ensurePnpm)({
      version: config.pnpmVersion,
      cacheRoot
    });
    const shim = (deps.ensurePnpmShim || ensurePnpmShim)({
      cacheRoot,
      nodeVersion: config.nodeVersion,
      pnpmVersion: config.pnpmVersion,
      platform,
      arch,
      nodePath: node.executablePath,
      pnpmCliPath: pnpm.executablePath
    });

    stderr.write(formatAppliedVersions({
      nodeVersion: config.nodeVersion,
      pnpmVersion: config.pnpmVersion
    }) + '\n');

    return spawnAndReturn({
      spawnSync: deps.spawnSync || childProcess.spawnSync,
      command: node.executablePath,
      args: [pnpm.executablePath].concat(args),
      cwd,
      env: withPath(env, path.dirname(node.executablePath), shim.dir, platform),
      stdio: deps.stdio || 'inherit'
    });
  } catch (error) {
    stderr.write(formatError(error) + '\n');
    return 1;
  }
}

function spawnAndReturn(options) {
  const result = options.spawnSync(options.command, options.args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio
  });

  if (result.error) {
    throw result.error;
  }

  return typeof result.status === 'number' ? result.status : 0;
}

function withPath(env, nodeBinDir, shimDir, platform) {
  const nextEnv = Object.assign({}, env);
  const pathKey = findPathKey(nextEnv, platform);
  nextEnv[pathKey] = buildToolchainPath({
    currentPath: nextEnv[pathKey],
    shimDir,
    nodeBinDir,
    delimiter: getPathDelimiter(platform)
  });
  return nextEnv;
}

function findPathKey(env, platform) {
  if (platform === 'win32') {
    const existing = Object.keys(env).find((key) => key.toLowerCase() === 'path');
    return existing || 'Path';
  }

  return 'PATH';
}

function getPathDelimiter(platform) {
  return platform === 'win32' ? ';' : ':';
}

function formatAppliedVersions(options) {
  const parts = ['[nvmc] using', 'node@' + options.nodeVersion];

  if (options.pnpmVersion) {
    parts.push('pnpm@' + options.pnpmVersion);
  }

  return parts.join(' ');
}

function formatError(error) {
  return error && error.message ? error.message : String(error);
}

function usage() {
  return [
    'Usage:',
    '  nvmc --version',
    '  nvmc doctor',
    '  nvmc node <args...>',
    '  nvmc pnpm <args...>',
    '',
    'Project .npmrc:',
    '  nvmc-node=20.19.5',
    '  nvmc-pnpm=9.15.9',
    ''
  ].join('\n');
}

module.exports = {
  runCli,
  usage,
  formatAppliedVersions
};
