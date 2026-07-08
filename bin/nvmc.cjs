#!/usr/bin/env node
const { runCli } = require('../src/cli.cjs');

runCli(process.argv.slice(2)).then((exitCode) => {
  process.exitCode = exitCode;
}, (error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
