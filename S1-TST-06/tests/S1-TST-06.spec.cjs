// S1-TST-06: independent bug regression *source* checks; failing assertions identify unfixed code.
// Set HOPE_CLIENT_PATH to the actual Client directory. This does not touch application data.
const { test, expect } = require('@playwright/test');
const fs=require('fs'),path=require('path');
const client=process.env.HOPE_CLIENT_PATH || path.resolve(__dirname,'../../Client');
const read = (p) => fs.readFileSync(path.join(client,p),'utf8');
test('S1 bug: customer action guards should use permissions, not admin-only flags', async () => {
  test.skip(!fs.existsSync(path.join(client,'src/App.jsx')), 'Set HOPE_CLIENT_PATH to ERP Client folder');
  const app=read('src/App.jsx');
  expect(app).not.toMatch(/const canAdd = admin;\s*const canEdit = admin;\s*const canDelete = admin;/);
});
test('S1 bug: last-superadmin database protection is present in migrations', async () => {
  test.skip(!fs.existsSync(path.join(client,'supabase/migrations')), 'Set HOPE_CLIENT_PATH to ERP Client folder');
  const dir=path.join(client,'supabase/migrations');
  const sql=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).map(f=>read('supabase/migrations/'+f)).join('\n');
  expect(sql).toContain('hope_preserve_last_superadmin');
});
// These are code-presence regressions only; they do not certify deployed database safeguards.
