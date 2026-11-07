#!/usr/bin/env node
'use strict';
// Read-only checks for source features and permission patch; not a live functional test.
const fs=require('fs'),path=require('path');
const dir=path.resolve(process.argv[2]||'.');
const load=p=>fs.readFileSync(path.join(dir,p),'utf8');
const app=load('Client/src/App.jsx');
const sql=load('Client/supabase/migrations/20261104010000_admin_only_erp_writes.sql');
const tests=[
  ['User sign-in implementation',/signInWithPassword/.test(app)],
  ['Registration request implementation',/auth\.signUp/.test(app)],
  ['Password-reset request implementation',/resetPasswordForEmail/.test(app)],
  ['Customer per-right Add/Edit/Delete UI',/const canAdd = hasPermission\(user, 'customers.add', users\)/.test(app)&&/const canEdit = hasPermission\(user, 'customers.edit', users\)/.test(app)&&/const canDelete = hasPermission\(user, 'customers.delete', users\)/.test(app)],
  ['Generic per-action UI rights',/const canAdd = hasPermission\(user, actionPermissions.add, users\)/.test(app)],
  ['Write guard per action',/ERP_WRITE_RIGHTS\[collection\]\?\.\[editKey \? 'edit' : 'add'\]/.test(app)],
  ['Soft-delete logic exists',/is_deleted: isDeleted/.test(app)],
  ['Report product price excludes future effective dates',/item.effDate <= new Date\(\)\.toISOString\(\)\.slice\(0,10\)/.test(app)],
  ['Seven report labels', ['Top Customers','Product Master List','Top Products','Active Employees','All Employees','Employee Job History','Top Sales'].every(t=>app.includes(t))],
  ['Existing policy conflicts with per-action write if no new migration deployed',!/hope_admin_write_guard/.test(sql)]
];
for(const [name,pass] of tests)console.log(`${pass?'PASS':'FAIL'} ${name}`);
console.log('NOTE: these are source checks; never treat them as production verification.');
process.exitCode=tests.some(t=>!t[1])?1:0;
