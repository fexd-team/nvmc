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

test('migration skill bootstraps global tc without adding project dependency', () => {
  const skillPath = path.join(root, 'skills', 'migrate-to-fexd-toolchain', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  assert.ok(skill.indexOf('global `tc`') >= 0);
  assert.ok(skill.indexOf('Do not add `@fexd/toolchain` to the target project') >= 0);
  assert.ok(skill.indexOf('Node.js is older than 14') >= 0);
  assert.ok(skill.indexOf('bunx') >= 0);
  assert.ok(skill.indexOf('nvm') >= 0);
  assert.strictEqual(/pnpm\s+add\s+-D\s+@fexd\/toolchain/.test(skill), false);
  assert.strictEqual(/npm\s+(install|i)\s+(-D|--save-dev)\s+@fexd\/toolchain/.test(skill), false);
});

test('migration skill requires evidence-based version inference and confirmation', () => {
  const skillPath = path.join(root, 'skills', 'migrate-to-fexd-toolchain', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  assert.ok(skill.indexOf('pnpm-lock.yaml') >= 0);
  assert.ok(skill.indexOf('lockfileVersion') >= 0);
  assert.ok(skill.indexOf('packageManager') >= 0);
  assert.ok(skill.indexOf('Ask the user to confirm') >= 0);
  assert.ok(skill.indexOf('Do not edit `.npmrc` or `package.json` until the user confirms') >= 0);
  assert.strictEqual(skill.indexOf('tc-version-node=20.19.5'), -1);
  assert.strictEqual(skill.indexOf('tc-version-pnpm=9.15.9'), -1);
});

test('readme presents toolchain as a global command', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

  assert.ok(readme.indexOf('npm install -g @fexd/toolchain') >= 0);
  assert.ok(readme.indexOf('不要把 `@fexd/toolchain` 加到目标项目') >= 0);
  assert.strictEqual(/pnpm\s+add\s+-D\s+@fexd\/toolchain/.test(readme), false);
  assert.strictEqual(/npm\s+install\s+-D\s+@fexd\/toolchain/.test(readme), false);
});
