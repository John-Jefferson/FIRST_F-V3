#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const qaDir = path.resolve(__dirname, '..');
const resultFile = path.join(qaDir, 'qa-results.json');
if (!fs.existsSync(resultFile)) {
  console.error('qa-results.json not found. Run the Playwright suite first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
let passed = 0;
let failed = 0;
let skipped = 0;
function visit(items) {
  for (const item of items || []) {
    if (item.specs) {
      for (const spec of item.specs) {
        for (const test of spec.tests || []) {
          const result = test.results && test.results[test.results.length - 1];
          if (!result) continue;
          if (result.status === 'passed') passed++;
          else if (result.status === 'failed') failed++;
          else skipped++;
        }
      }
    }
    visit(item.suites);
  }
}
visit(report.suites);
console.log(JSON.stringify({ passed, failed, skipped, source: 'qa-results.json' }, null, 2));
