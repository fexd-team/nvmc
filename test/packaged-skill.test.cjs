const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

test('packages the migration skill for downstream agents', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const skillPath = path.join(root, 'skills', 'migrate-to-fexd-toolchain', 'SKILL.md');

  assert.ok(pkg.files.includes('skills'));
  assert.ok(fs.existsSync(skillPath));

  const skill = fs.readFileSync(skillPath, 'utf8');
  assert.ok(skill.indexOf('name: migrate-to-fexd-toolchain') >= 0);
  assert.ok(skill.indexOf('description: Use when') >= 0);
  assert.ok(skill.indexOf('pnpm.cmd') >= 0);
  assert.ok(skill.indexOf('tc-version-node') >= 0);
  assert.ok(skill.indexOf('tc pnpm') >= 0);
});
