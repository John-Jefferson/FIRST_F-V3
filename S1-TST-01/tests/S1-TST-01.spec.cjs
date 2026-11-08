// S1-TST-01: test plan / acceptance criteria, independently checked as documentation.
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const plan = path.resolve(__dirname, '../docs/S1-TST-01_TEST_PLAN.md');
test('Sprint 1 plan exists and names all six required task IDs', async () => {
  const contents = fs.readFileSync(plan, 'utf8');
  for (let i=1; i<=6; i++) expect(contents).toContain(`S1-TST-0${i}`);
  expect(contents).toContain('Acceptance criteria');
});
// Passing this test validates document completeness, not application functionality.
