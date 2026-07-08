const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readToolchainConfig, writeToolchainConfig } = require('../src/config.cjs');

function tempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nvmc-config-'));
  return {
    root,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true })
  };
}

test('reads toolchain versions from the project npmrc when called in a subdirectory', () => {
  const project = tempProject();

  try {
    fs.writeFileSync(path.join(project.root, 'package.json'), '{"name":"demo"}');
    fs.writeFileSync(path.join(project.root, '.npmrc'), [
      'nvmc-node=20.19.5',
      'nvmc-pnpm=9.15.9',
      ''
    ].join('\n'));

    const subdir = path.join(project.root, 'packages', 'app');
    fs.mkdirSync(subdir, { recursive: true });

    const config = readToolchainConfig(subdir);

    assert.strictEqual(config.root, project.root);
    assert.strictEqual(config.nodeVersion, '20.19.5');
    assert.strictEqual(config.pnpmVersion, '9.15.9');
  } finally {
    project.cleanup();
  }
});

test('does not read legacy tc-version npmrc keys', () => {
  const project = tempProject();

  try {
    fs.writeFileSync(path.join(project.root, 'package.json'), '{"name":"demo"}');
    fs.writeFileSync(path.join(project.root, '.npmrc'), [
      'tc-version-node=20.19.5',
      'tc-version-pnpm=9.15.9',
      ''
    ].join('\n'));

    const config = readToolchainConfig(project.root);

    assert.strictEqual(config.nodeVersion, '');
    assert.strictEqual(config.pnpmVersion, '');
  } finally {
    project.cleanup();
  }
});

test('writes nvmc versions to project npmrc while preserving other npm settings', () => {
  const project = tempProject();

  try {
    fs.writeFileSync(path.join(project.root, 'package.json'), '{"name":"demo"}');
    fs.writeFileSync(path.join(project.root, '.npmrc'), [
      'registry=https://registry.npmjs.org/',
      'nvmc-node=18.20.3',
      ''
    ].join('\n'));

    const result = writeToolchainConfig(project.root, {
      nodeVersion: '16.20.2',
      pnpmVersion: '6.35.1'
    });

    const text = fs.readFileSync(path.join(project.root, '.npmrc'), 'utf8');

    assert.strictEqual(result.root, project.root);
    assert.strictEqual(result.nodeVersion, '16.20.2');
    assert.strictEqual(result.pnpmVersion, '6.35.1');
    assert.ok(text.indexOf('registry=https://registry.npmjs.org/') >= 0);
    assert.ok(text.indexOf('nvmc-node=16.20.2') >= 0);
    assert.ok(text.indexOf('nvmc-pnpm=6.35.1') >= 0);
    assert.strictEqual(text.indexOf('nvmc-node=18.20.3'), -1);
  } finally {
    project.cleanup();
  }
});
