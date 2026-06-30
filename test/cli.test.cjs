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

  const exitCode = await runCli(['node', '-v'], baseDeps(spawns));

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(spawns.length, 1);
  assert.strictEqual(spawns[0].command, '/cache/node/bin/node');
  assert.deepStrictEqual(spawns[0].args, ['-v']);
  assert.strictEqual(spawns[0].options.env.PATH, path.dirname('/cache/node/bin/node') + ':global-bin');
});

test('runs pnpm commands through the configured Node.js and pnpm CLI', async () => {
  const spawns = [];

  const exitCode = await runCli(['pnpm', 'init'], baseDeps(spawns));

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(spawns.length, 1);
  assert.strictEqual(spawns[0].command, '/cache/node/bin/node');
  assert.deepStrictEqual(spawns[0].args, ['/cache/pnpm/package/bin/pnpm.cjs', 'init']);
  assert.strictEqual(spawns[0].options.env.PATH, '/cache/shims:' + path.dirname('/cache/node/bin/node') + ':global-bin');
});

test('doctor prints the configured versions without spawning commands', async () => {
  const spawns = [];
  let output = '';
  const deps = baseDeps(spawns);
  deps.stdout = { write: (chunk) => { output += chunk; } };

  const exitCode = await runCli(['doctor'], deps);

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(spawns.length, 0);
  assert.ok(output.indexOf('Node.js: 20.19.5') >= 0);
  assert.ok(output.indexOf('pnpm: 9.15.9') >= 0);
});
