'use strict';
// Unit-test controlled replacements against a minimal fixture matching the inspected source.
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const fix=path.resolve(__dirname,'../../fixes/apply-permission-guards.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hope-erp-qa-'));
try {
 const src=path.join(dir,'Client/src');fs.mkdirSync(src,{recursive:true});
 const file=path.join(src,'App.jsx');
 const input=`function CustomersPage({user,users}) {\n  const admin = isAdmin(user);\n  const canAdd = admin;\n  const canEdit = admin;\n  const canDelete = admin;\n}\nconst COLLECTIONS = {};\nfunction RecordsPage({user,users}) {\n  const actionPermissions = {add:'x',edit:'y',delete:'z'};\n  const canAdd = isAdmin(user);\n  const canEdit = isAdmin(user);\n  const canDelete = isAdmin(user);\n    if (filter === 'inactive' && !record.isDeleted) return false;\n}\nconst REPORTS = {};
function ReportsPage({data,product}){
const price = data.prices.filter((item) => item.prodCode === product.prodCode && !item.isDeleted).sort((a, b) => b.effDate.localeCompare(a.effDate))[0];
}\nexport default function App(){\n  const customers = data.customers;\n  async function saveRecord(collection, record, keyFields, editKey=null){\n    if (!isAdmin(currentUser)) return { error: 'Only admins and superadmins can change ERP data.' };\n  }\n  async function changeRecordState(collection, key, isDeleted){\n    if (!isAdmin(currentUser)) return setAppError('Only admins and superadmins can change ERP data.');\n  }\n}\n`;
 fs.writeFileSync(file,input);
 cp.execFileSync(process.execPath,[fix,dir],{stdio:'pipe'});
 const out=fs.readFileSync(file,'utf8');
 for(const expected of ["hasPermission(user, 'customers.add', users)","hasPermission(user, 'customers.edit', users)","hasPermission(user, 'customers.delete', users)","hasPermission(user, actionPermissions.add, users)","hasPermission(user, actionPermissions.edit, users)","hasPermission(user, actionPermissions.delete, users)","ERP_WRITE_RIGHTS[collection]?.[editKey ? 'edit' : 'add']","ERP_WRITE_RIGHTS[collection]?.delete","item.effDate <= new Date().toISOString().slice(0,10)"]) if(!out.includes(expected))throw Error('Missing: '+expected);
 cp.execFileSync(process.execPath,[fix,dir],{stdio:'pipe'});
 if(fs.readFileSync(file,'utf8')!==out)throw Error('Not idempotent');
 console.log('PASS: permission-guard patch fixture; all six guards and idempotence validated');
} finally{fs.rmSync(dir,{recursive:true,force:true});}
