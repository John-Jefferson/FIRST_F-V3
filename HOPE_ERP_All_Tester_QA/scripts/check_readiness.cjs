#!/usr/bin/env node
/** Read-only preflight. No credentials, network access, or database writes. */
const fs = require('node:fs');
const path = require('node:path');
const qaDir = path.resolve(__dirname, '..');
const projectRoot = path.resolve(qaDir, '..');
const candidates = [
  path.join(projectRoot, 'Client'),
  path.join(qaDir, '..', '..', 'Client'),
  process.env.HOPE_CLIENT_PATH ? path.resolve(process.env.HOPE_CLIENT_PATH) : null,
].filter(Boolean);
const client = candidates.find(p => fs.existsSync(path.join(p, 'src', 'App.jsx')));
const summary = [];
function result(label, status, detail) { summary.push({ label, status, detail }); }
const definitions = JSON.parse(fs.readFileSync(path.join(qaDir,'docs','task_definitions.json'), 'utf8'));
const taskText = JSON.stringify(definitions);
for (let s=1; s<=4; s++) {
  const taskIds = [...taskText.matchAll(new RegExp(`S${s}-TST-0[1-6]`, 'g'))].map(m=>m[0]);
  result(`Sprint ${s} task identifiers`, new Set(taskIds).size===6?'OK':'FAIL', `${new Set(taskIds).size}/6 found`);
}
const expectedFiles=['tests/smoke.spec.cjs','tests/roles.spec.cjs','tests/guide-readonly.spec.cjs','tests/sprint-coverage-readonly.spec.cjs','playwright.config.cjs','docs/TEST_CASES_ALL_24.md'];
for(const f of expectedFiles) result('QA '+f,fs.existsSync(path.join(qaDir,f))?'OK':'FAIL','exists in submission');
if(!client){
  result('Client source','BLOCKED','Client/src/App.jsx not found; place this folder beside Client or set HOPE_CLIENT_PATH');
} else {
  const app=fs.readFileSync(path.join(client,'src','App.jsx'),'utf8');
  const perms=(app.match(/const PERMISSIONS\s*=\s*\[([\s\S]*?)\];/)||[])[1];
  const names=perms?[...perms.matchAll(/'([^']+)'/g)].map(x=>x[1]):[];
  result('Permission catalogue','REVIEW',`${names.length} permission codes in current source; compare with 36 action rights required by guide`);
  result('UI add/edit/delete guard','REVIEW',app.includes('const canAdd = isAdmin(user)')?'Admin-only UI guard found; compare against per-right requirements':'Manual per-action inspection needed');
  result('Authentication','REVIEW',app.includes('signInWithPassword')?'Supabase auth integration found, live auth still untested':'Auth implementation not identified');
  const migrationDir=path.join(client,'supabase','migrations');
  if(fs.existsSync(migrationDir)) {
    const migrations=fs.readdirSync(migrationDir).filter(f=>f.endsWith('.sql'));
    result('SQL migrations','REVIEW',`${migrations.length} migration files; inspect deployed RLS policies before sign-off`);
  } else result('SQL migrations','BLOCKED','No local migration folder');
}
for(const row of summary) console.log(`${row.status.padEnd(8)} ${row.label}: ${row.detail}`);
const failures=summary.filter(x=>x.status==='FAIL');
console.log(`\nLocal checks: ${summary.length}; failures: ${failures.length}. REVIEW/BLOCKED are NOT passes.`);
process.exitCode=failures.length?1:0;
