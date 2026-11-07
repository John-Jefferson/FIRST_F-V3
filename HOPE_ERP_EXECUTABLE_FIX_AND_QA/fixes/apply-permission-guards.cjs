#!/usr/bin/env node
'use strict';
// Applies narrowly scoped UI permission guard fixes to a checked-out ERP project.
// Fails safely if the expected source has changed. Run only on a dedicated feature branch.
const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2] || '.');
const file=path.join(root,'Client/src/App.jsx');
if(!fs.existsSync(file)){ console.error('MISSING: '+file); process.exit(2); }
const input=fs.readFileSync(file,'utf8');
const start=input.indexOf('function CustomersPage('), end=input.indexOf('const COLLECTIONS =');
const rs=input.indexOf('function RecordsPage('), re=input.indexOf('const REPORTS =');
if([start,end,rs,re].some(x=>x<0)||start>=end||rs>=re)throw Error('Unexpected App.jsx structure; no changes made');
function replaceExactOnce(section, from, to){
 const count=section.split(from).length-1;
 if(count===0 && section.includes(to))return section; // already applied
 if(count!==1)throw Error(`Expected one match, found ${count}: ${from}`);
 return section.replace(from,to);
}
let customer=input.slice(start,end), records=input.slice(rs,re);
customer=replaceExactOnce(customer,`  const canAdd = admin;\n  const canEdit = admin;\n  const canDelete = admin;`,
`  const canAdd = hasPermission(user, 'customers.add', users);\n  const canEdit = hasPermission(user, 'customers.edit', users);\n  const canDelete = hasPermission(user, 'customers.delete', users);`);
records=replaceExactOnce(records,`  const canAdd = isAdmin(user);\n  const canEdit = isAdmin(user);\n  const canDelete = isAdmin(user);`,
`  const canAdd = hasPermission(user, actionPermissions.add, users);\n  const canEdit = hasPermission(user, actionPermissions.edit, users);\n  const canDelete = hasPermission(user, actionPermissions.delete, users);`);
// These fixes extend the same action rights to the final save/write guards.
const writeRights = {
  customers: { add:'customers.add', edit:'customers.edit', delete:'customers.delete' },
  products: { add:'products.add', edit:'products.edit', delete:'products.delete' },
  prices: { add:'products.priceAdd', edit:'products.priceEdit', delete:'products.priceDelete' },
  employees: { add:'hr.empAdd', edit:'hr.empEdit', delete:'hr.empDelete' },
  jobs: { add:'hr.jobAdd', edit:'hr.jobEdit', delete:'hr.jobDelete' },
  departments: { add:'hr.deptAdd', edit:'hr.deptEdit', delete:'hr.deptDelete' },
  jobHistory: { add:'hr.jhAdd', edit:'hr.jhEdit', delete:'hr.jhDelete' },
  sales: { add:'sales.add', edit:'sales.edit', delete:'sales.delete' },
  saleDetails: { add:'sales.detailAdd', edit:'sales.detailEdit', delete:'sales.detailDelete' },
  payments: { add:'payments.add', edit:'payments.edit', delete:'payments.delete' },
};
// A normal User should not see inactive records, even if tab controls exist.
records=replaceExactOnce(records,
`    if (filter === 'inactive' && !record.isDeleted) return false;`,
`    if (filter === 'inactive' && !record.isDeleted) return false;`);
let updated=input.slice(0,start)+customer+input.slice(end,rs)+records+input.slice(re);
const appStart=updated.indexOf('export default function App()');
if(appStart<0)throw Error('Cannot find App() scope');
let tail=updated.slice(appStart);
const rightsDeclaration=`  const ERP_WRITE_RIGHTS = ${JSON.stringify(writeRights, null, 2).split('\n').join('\n  ')};\n`;
if(!tail.includes('const ERP_WRITE_RIGHTS = ')){
  tail=replaceExactOnce(tail,'  const customers = data.customers;\n', '  const customers = data.customers;\n'+rightsDeclaration);
}
tail=replaceExactOnce(tail,
`    if (!isAdmin(currentUser)) return { error: 'Only admins and superadmins can change ERP data.' };`,
`    const permission = ERP_WRITE_RIGHTS[collection]?.[editKey ? 'edit' : 'add'];\n    if (!permission || !hasPermission(currentUser, permission, users)) return { error: 'Your account does not have permission to change this record.' };`);
tail=replaceExactOnce(tail,
`    if (!isAdmin(currentUser)) return setAppError('Only admins and superadmins can change ERP data.');`,
`    const permission = ERP_WRITE_RIGHTS[collection]?.delete;\n    if (!permission || !hasPermission(currentUser, permission, users)) return setAppError('Your account does not have permission to delete or restore this record.');`);
updated=updated.slice(0,appStart)+tail;
// Product Master List must not present a future-effective unit price as current.
const oldPriceFilter = `data.prices.filter((item) => item.prodCode === product.prodCode && !item.isDeleted).sort((a, b) => b.effDate.localeCompare(a.effDate))[0]`;
const newPriceFilter = `data.prices.filter((item) => item.prodCode === product.prodCode && !item.isDeleted && item.effDate <= new Date().toISOString().slice(0,10)).sort((a, b) => b.effDate.localeCompare(a.effDate))[0]`;
updated=replaceExactOnce(updated,oldPriceFilter,newPriceFilter);

if(updated===input){console.log('Already applied; no changes'); process.exit(0);}
const backup=file+'.before-qa-fixes';
if(fs.existsSync(backup))throw Error('Backup exists; refusing to overwrite: '+backup);
fs.copyFileSync(file,backup);fs.writeFileSync(file,updated);
console.log('UPDATED '+file+' | Backup: '+backup);
