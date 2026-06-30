const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readToolchainConfig } = require('../src/config.cjs');

function tempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-config-'));
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
      'tc-version-node=20.19.5',
      'tc-version-pnpm=9.15.9',
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
