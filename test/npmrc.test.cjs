const assert = require('assert');
const { parseNpmrcText } = require('../src/npmrc.cjs');

test('parses toolchain versions from npmrc text', () => {
  const config = parseNpmrcText([
    '# normal npm config can coexist',
    'registry=https://registry.npmjs.org/',
    'tc-version-node=20.19.5',
    'tc-version-pnpm=9.15.9',
    ''
  ].join('\n'));

  assert.strictEqual(config['tc-version-node'], '20.19.5');
  assert.strictEqual(config['tc-version-pnpm'], '9.15.9');
});
