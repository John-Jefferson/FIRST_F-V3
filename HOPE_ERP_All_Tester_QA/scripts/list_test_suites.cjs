#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const testsDir = path.resolve(__dirname, '..', 'tests');
const suites = fs.readdirSync(testsDir)
  .filter(name => name.endsWith('.spec.cjs'))
  .sort();

for (const suite of suites) {
  console.log(suite);
}
console.log(`Suite count: ${suites.length}`);
