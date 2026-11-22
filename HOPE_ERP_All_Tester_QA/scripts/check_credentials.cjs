#!/usr/bin/env node
const roles = {
  user: ['QA_USER_EMAIL', 'QA_USER_PASSWORD'],
  admin: ['QA_ADMIN_EMAIL', 'QA_ADMIN_PASSWORD'],
  superadmin: ['QA_SUPERADMIN_EMAIL', 'QA_SUPERADMIN_PASSWORD'],
};
let available = 0;
for (const [role, names] of Object.entries(roles)) {
  const ready = names.every(name => Boolean(process.env[name]));
  console.log(`${ready ? 'READY' : 'SKIPPED'} ${role}: ${ready ? 'credentials available' : 'credentials not set'}`);
  if (ready) available++;
}
console.log(`Available role pairs: ${available}/3`);
console.log('SKIPPED roles are not pass evidence.');
