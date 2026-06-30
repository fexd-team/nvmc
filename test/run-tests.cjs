const fs = require('fs');
const path = require('path');

const testFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith('.test.cjs'))
  .sort();

const tests = [];

global.test = function test(name, fn) {
  tests.push({ name, fn });
};

for (const file of testFiles) {
  require(path.join(__dirname, file));
}

(async () => {
  let failures = 0;

  for (const item of tests) {
  try {
      await item.fn();
      console.log('ok - ' + item.name);
  } catch (error) {
    failures += 1;
      console.error('not ok - ' + item.name);
    console.error(error && error.stack ? error.stack : error);
  }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
})();
