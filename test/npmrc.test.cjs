const assert = require('assert');
const { parseNpmrcText, updateNpmrcText } = require('../src/npmrc.cjs');

test('parses toolchain versions from npmrc text', () => {
  const config = parseNpmrcText([
    '# normal npm config can coexist',
    'registry=https://registry.npmjs.org/',
    'nvmc-node=20.19.5',
    'nvmc-pnpm=9.15.9',
    ''
  ].join('\n'));

  assert.strictEqual(config['nvmc-node'], '20.19.5');
  assert.strictEqual(config['nvmc-pnpm'], '9.15.9');
});

test('updates nvmc versions in npmrc text without removing other settings', () => {
  const text = [
    '# normal npm config can coexist',
    'registry=https://registry.npmjs.org/',
    'nvmc-node=18.20.3',
    ''
  ].join('\n');

  const nextText = updateNpmrcText(text, {
    'nvmc-node': '20.19.5',
    'nvmc-pnpm': '9.15.9'
  });

  assert.ok(nextText.indexOf('# normal npm config can coexist') >= 0);
  assert.ok(nextText.indexOf('registry=https://registry.npmjs.org/') >= 0);
  assert.ok(nextText.indexOf('nvmc-node=20.19.5') >= 0);
  assert.ok(nextText.indexOf('nvmc-pnpm=9.15.9') >= 0);
  assert.strictEqual(nextText.indexOf('nvmc-node=18.20.3'), -1);
});

test('creates npmrc text without a leading blank line', () => {
  const nextText = updateNpmrcText('', {
    'nvmc-node': '20.19.5',
    'nvmc-pnpm': '9.15.9'
  });

  assert.strictEqual(nextText, [
    'nvmc-node=20.19.5',
    'nvmc-pnpm=9.15.9',
    ''
  ].join('\n'));
});
