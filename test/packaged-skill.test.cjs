const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

test('packages the migration skill for downstream agents', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const skillPath = path.join(root, 'skills', 'migrate-to-nvmc', 'SKILL.md');

  assert.ok(pkg.files.includes('skills'));
  assert.ok(fs.existsSync(skillPath));

  const skill = fs.readFileSync(skillPath, 'utf8');
  assert.ok(skill.indexOf('name: migrate-to-nvmc') >= 0);
  assert.ok(skill.indexOf('description: Use when') >= 0);
  assert.ok(skill.indexOf('pnpm.cmd') >= 0);
  assert.ok(skill.indexOf('nvmc-node') >= 0);
  assert.ok(skill.indexOf('nvmc pnpm') >= 0);
});

test('migration skill chooses npx or global nvmc from host npm capability', () => {
  const skillPath = path.join(root, 'skills', 'migrate-to-nvmc', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  assert.ok(skill.indexOf('npm major is 7 or newer') >= 0);
  assert.ok(skill.indexOf('npx -y nvmc') >= 0);
  assert.ok(skill.indexOf('npm install -g nvmc') >= 0);
  assert.strictEqual(/nvmc@\d/.test(skill), false);
  assert.ok(skill.indexOf('nvmc version') >= 0);
  assert.ok(skill.indexOf('Node.js 12.17') >= 0);
  assert.strictEqual(/@fexd\/toolchain/.test(skill), false);
  assert.strictEqual(/\btoolchain\b/i.test(skill), false);
  assert.strictEqual(/\btc\b/.test(skill), false);
});

test('migration skill requires evidence-based version inference and confirmation', () => {
  const skillPath = path.join(root, 'skills', 'migrate-to-nvmc', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');

  assert.ok(skill.indexOf('pnpm-lock.yaml') >= 0);
  assert.ok(skill.indexOf('lockfileVersion') >= 0);
  assert.ok(skill.indexOf('packageManager') >= 0);
  assert.ok(skill.indexOf('Ask the user to confirm') >= 0);
  assert.ok(skill.indexOf('Do not edit `.npmrc` or `package.json` until the user confirms') >= 0);
  assert.strictEqual(skill.indexOf('nvmc-node=20.19.5'), -1);
  assert.strictEqual(skill.indexOf('nvmc-pnpm=9.15.9'), -1);
});

test('readme presents concise nvmc usage and no legacy branding', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

  assert.ok(readme.indexOf('# nvmc') >= 0);
  assert.ok(readme.indexOf('nvmc init --node') >= 0);
  assert.ok(readme.indexOf('npm install -g nvmc') >= 0);
  assert.ok(readme.indexOf('npx -y nvmc') >= 0);
  assert.ok(readme.indexOf('migrate-to-nvmc') >= 0);
  assert.ok(readme.indexOf('skills/migrate-to-nvmc/SKILL.md') >= 0);
  assert.ok(readme.indexOf('agent') >= 0);
  assert.strictEqual((readme.match(/npx -y nvmc/g) || []).length, 1);
  assert.strictEqual(/nvmc@\d/.test(readme), false);
  assert.ok(readme.indexOf('nvmc-node') >= 0);
  assert.ok(readme.indexOf('nvmc-pnpm') >= 0);
  assert.ok(readme.indexOf('nvmc init --node') < readme.indexOf('nvmc pnpm install'));
  assert.strictEqual(/@fexd\/toolchain/.test(readme), false);
  assert.strictEqual(/\btoolchain\b/i.test(readme), false);
  assert.strictEqual(/\btc\b/.test(readme), false);
});
