const { test, expect } = require('@playwright/test');
/*
  Sprint-wide read-only assertions. These are NOT a substitute for full functional
  CRUD/authorization tests. They never submit business writes and must run against
  an authorized QA database. Missing account credentials => test skipped.
*/
const areas = [
  { label:'Customer', nav:'Customers', tabs:[], heading:'Customers', task:'S2-TST-01' },
  { label:'Product', nav:'Products', tabs:['Products','Price history'], heading:'Products', task:'S2-TST-02' },
  { label:'HR', nav:'Human resources', tabs:['Employees','Jobs','Departments','Job history'], heading:'Human resources', task:'S3-TST-01' },
  { label:'Sales', nav:'Sales', tabs:['Sales','Sale details'], heading:'Sales', task:'S4-TST-01' },
  { label:'Payment', nav:'Payments', tabs:['Payments'], heading:'Payments', task:'S4-TST-02' },
  { label:'Reports', nav:'Reports', tabs:['Top Customers','Product Master List','Top Products','Active Employees','All Employees','Employee Job History','Top Sales'], heading:'Reports', task:'S4-TST-03' },
  { label:'Users', nav:'Users', tabs:[], heading:'Users', task:'S1-TST-03' },
];
const roleSpecs = [
  {prefix:'QA_USER',role:'user'},
  {prefix:'QA_ADMIN',role:'admin'},
  {prefix:'QA_SUPERADMIN',role:'superadmin'},
];
for (const spec of roleSpecs) {
  test.describe(`Sprint coverage, ${spec.role} (read-only)`, () => {
    test.beforeEach(async ({page}) => {
      const email=process.env[spec.prefix+'_EMAIL'];
      const pass=process.env[spec.prefix+'_PASSWORD'];
      test.skip(!email || !pass,`Missing ${spec.prefix}_EMAIL/PASSWORD locally`);
      await page.route('**/*', route => {
        const req=route.request();
        if (/\/rest\/v1\//.test(req.url()) && !['GET','HEAD','OPTIONS'].includes(req.method()))
          return route.abort('blockedbyclient');
        if (/\/functions\/v1\/manage-user/.test(req.url())) return route.abort('blockedbyclient');
        return route.continue();
      });
      await page.goto('/main.html');
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.locator('#login-email').fill(email);
      await page.locator('#login-password').fill(pass);
      await page.locator('.modal-body button[type="submit"]').click();
      await expect(page.locator('.dashboard-nav')).toBeVisible({timeout:30000});
    });
    for (const area of areas) {
      test(`${area.task}: ${area.label} module visibility and read-only access`,async ({page}) => {
        const nav=page.locator('.dashboard-nav');
        const button=nav.getByRole('button',{name:new RegExp('^'+area.nav+'$','i')});
        if (spec.role==='user') {
          if(area.nav==='Users') {await expect(button).toHaveCount(0);return;}
          if(await button.count()===0) { test.skip(true,`${area.nav} not granted to this User account`); }
        }
        await expect(button).toBeVisible();
        await button.click();
        await expect(page.locator('.dashboard-main .page-heading h1')).toBeVisible();
        // Covers navigation and tab discoverability only, not database correctness.
        if(spec.role!=='user' && area.tabs.length) {
          const tabs=page.locator('[role="tablist"]');
          await expect(tabs.first()).toBeVisible();
          for(const name of area.tabs) {
            const tab=tabs.getByRole('tab',{name:new RegExp(name,'i')});
            await expect(tab).toBeVisible();
            await tab.click();
            await expect(page.locator('.dashboard-shell')).toBeVisible();
          }
        }
      });
    }
    test('S1-TST-04 / S2-TST-04 / S3-TST-04: user should not see admin write buttons',async ({page})=>{
      test.skip(spec.role!=='user','Applicable to User role');
      const modules=['Customers','Products','Human resources','Sales','Payments'];
      for(const moduleName of modules) {
        const btn=page.locator('.dashboard-nav').getByRole('button',{name:new RegExp('^'+moduleName+'$','i')});
        if(await btn.count()===0) continue;
        await btn.click();
        await expect(page.getByRole('button',{name:/^\s*(?:\+\s*)?Add\s+(customer|record|product|sale|payment|employee|job)/i})).toHaveCount(0);
      }
    });
    test('S2-TST-03: customer active/inactive filter is role dependent',async ({page})=>{
      const btn=page.locator('.dashboard-nav').getByRole('button',{name:/^Customers$/i});
      if(await btn.count()===0)test.skip(true,'No Customers module grant');
      await btn.click();
      await expect(page.getByRole('tab',{name:/^Active\b/i})).toBeVisible();
      const inactive=page.getByRole('tab',{name:/^Inactive\b/i});
      if(spec.role==='user') await expect(inactive).toHaveCount(0);
      else await expect(inactive).toBeVisible();
    });
  });
}
