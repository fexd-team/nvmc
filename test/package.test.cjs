const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

test('package metadata publishes @fexd/nvmc with a single nvmc binary', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.strictEqual(pkg.name, '@fexd/nvmc');
  assert.strictEqual(pkg.version, '0.1.0');
  assert.deepStrictEqual(pkg.bin, { nvmc: 'bin/nvmc.cjs' });
  assert.strictEqual(pkg.repository.url, 'git+https://github.com/fexd-team/nvmc.git');
  assert.strictEqual(pkg.homepage, 'https://github.com/fexd-team/nvmc#readme');
  assert.strictEqual(pkg.engines.node, '>=12.17');
  assert.deepStrictEqual(pkg.maintainers, ['chenjy']);
  assert.ok(pkg.files.includes('README.zh-CN.md'));
  assert.ok(pkg.keywords.includes('node-version-manager'));
  assert.ok(pkg.keywords.includes('pnpm'));
  assert.ok(pkg.keywords.includes('version-manager'));
});
