#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const qaDir = path.resolve(__dirname, '..');
const required = [
  'playwright.config.cjs',
  'tests/smoke.spec.cjs',
  'tests/roles.spec.cjs',
  'tests/guide-readonly.spec.cjs',
  'tests/sprint-coverage-readonly.spec.cjs',
];

const missing = required.filter(relative => !fs.existsSync(path.join(qaDir, relative)));
if (missing.length) {
  for (const item of missing) console.error(`MISSING ${item}`);
  process.exit(1);
}
console.log(`PASS - ${required.length} required QA paths found.`);
