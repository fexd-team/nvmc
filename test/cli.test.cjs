const assert = require('assert');
const path = require('path');
const { runCli } = require('../src/cli.cjs');

function baseDeps(spawns) {
  return {
    cwd: '/repo',
    platform: 'darwin',
    arch: 'arm64',
    env: { PATH: 'global-bin' },
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    readToolchainConfig: () => ({
      root: '/repo',
      nodeVersion: '20.19.5',
      pnpmVersion: '9.15.9',
      npmrcPath: '/repo/.npmrc'
    }),
    getDefaultCacheRoot: () => '/cache',
    ensureNode: async () => ({
      executablePath: '/cache/node/bin/node',
      installDir: '/cache/node',
      distribution: { version: '20.19.5' }
    }),
    ensurePnpm: async () => ({
      executablePath: '/cache/pnpm/package/bin/pnpm.cjs',
      installDir: '/cache/pnpm',
      distribution: { version: '9.15.9' }
    }),
    ensurePnpmShim: () => ({
      dir: '/cache/shims',
      command: '/cache/shims/pnpm'
    }),
    spawnSync: (command, args, options) => {
      spawns.push({ command, args, options });
      return { status: 0 };
    }
  };
}

test('runs node commands through the configured Node.js executable', async () => {
  const spawns = [];
  let stderr = '';
  const deps = baseDeps(spawns);
  deps.stderr = { write: (chunk) => { stderr += chunk; } };

  const exitCode = await runCli(['node', '-v'], deps);

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(spawns.length, 1);
  assert.strictEqual(spawns[0].command, '/cache/node/bin/node');
  assert.deepStrictEqual(spawns[0].args, ['-v']);
  assert.strictEqual(spawns[0].options.env.PATH, path.dirname('/cache/node/bin/node') + ':global-bin');
  assert.strictEqual(stderr, '[nvmc] using node@20.19.5\n');
});

test('runs pnpm commands through the configured Node.js and pnpm CLI', async () => {
  const spawns = [];
  let stderr = '';
  const deps = baseDeps(spawns);
  deps.stderr = { write: (chunk) => { stderr += chunk; } };

  const exitCode = await runCli(['pnpm', 'init'], deps);

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(spawns.length, 1);
  assert.strictEqual(spawns[0].command, '/cache/node/bin/node');
  assert.deepStrictEqual(spawns[0].args, ['/cache/pnpm/package/bin/pnpm.cjs', 'init']);
  assert.strictEqual(spawns[0].options.env.PATH, '/cache/shims:' + path.dirname('/cache/node/bin/node') + ':global-bin');
  assert.strictEqual(stderr, '[nvmc] using node@20.19.5 pnpm@9.15.9\n');
});

test('doctor prints the configured versions without spawning commands', async () => {
  const spawns = [];
  let output = '';
  let stderr = '';
  const deps = baseDeps(spawns);
  deps.stdout = { write: (chunk) => { output += chunk; } };
  deps.stderr = { write: (chunk) => { stderr += chunk; } };

  const exitCode = await runCli(['doctor'], deps);

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(spawns.length, 0);
  assert.ok(output.indexOf('Node.js: 20.19.5') >= 0);
  assert.ok(output.indexOf('pnpm: 9.15.9') >= 0);
  assert.strictEqual(stderr, '');
});

test('prints the package version without requiring project config', async () => {
  const spawns = [];
  let output = '';
  const deps = baseDeps(spawns);
  deps.stdout = { write: (chunk) => { output += chunk; } };
  deps.readToolchainConfig = () => {
    throw new Error('should not read project config for version');
  };

  const exitCode = await runCli(['--version'], deps);

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(spawns.length, 0);
  assert.match(output, /^\d+\.\d+\.\d+\n$/);
});
