# Recent code changes

This file collects the recent implementation snippets and points to their live source files.
The application source remains in `Client/src/` and the launcher remains `launch_hope_erp.js`.

## Per-action ERP permissions

Added to `Client/src/App.jsx`:

```js
const ERP_WRITE_PERMISSIONS = {
  customers: { add: 'customers.add', edit: 'customers.edit', delete: 'customers.delete' },
  products: { add: 'products.add', edit: 'products.edit', delete: 'products.delete' },
  prices: { add: 'products.priceAdd', edit: 'products.priceEdit', delete: 'products.priceDelete' },
  employees: { add: 'hr.empAdd', edit: 'hr.empEdit', delete: 'hr.empDelete' },
  jobs: { add: 'hr.jobAdd', edit: 'hr.jobEdit', delete: 'hr.jobDelete' },
  departments: { add: 'hr.deptAdd', edit: 'hr.deptEdit', delete: 'hr.deptDelete' },
  jobHistory: { add: 'hr.jhAdd', edit: 'hr.jhEdit', delete: 'hr.jhDelete' },
  sales: { add: 'sales.add', edit: 'sales.edit', delete: 'sales.delete' },
  saleDetails: { add: 'sales.detailAdd', edit: 'sales.detailEdit', delete: 'sales.detailDelete' },
  payments: { add: 'payments.add', edit: 'payments.edit', delete: 'payments.delete' },
};
```

Customer and record screens use `hasPermission` for their Add, Edit, and Delete controls. Save handlers check the corresponding action permission before sending a write request. Record restoration remains admin-only.

## Password recovery callback

`requestPasswordReset` in `Client/src/App.jsx` requests a link back to the current app origin and records a short-lived local marker:

```js
const redirectTo = `${window.location.origin}/main.html`;
const { error } = await supabase.auth.resetPasswordForEmail(
  email.trim(),
  { redirectTo }
);
if (error) return { error: error.message };

window.localStorage.setItem(
  'hope-erp-password-recovery-requested-at',
  String(Date.now()),
);
return {};
```

On app startup the recovery screen is selected for Supabase recovery links, and the auth listener also handles the `PASSWORD_RECOVERY` event:

```js
const queryParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.slice(1));
const recoveryRequestedAt = Number(
  window.localStorage.getItem('hope-erp-password-recovery-requested-at'),
);
const hasRecentRecoveryRequest = Number.isFinite(recoveryRequestedAt)
  && Date.now() - recoveryRequestedAt < 60 * 60 * 1000;
const isPasswordRecoveryRedirect = queryParams.get('type') === 'recovery'
  || hashParams.get('type') === 'recovery'
  || (hasRecentRecoveryRequest && queryParams.has('code'));
if (isPasswordRecoveryRedirect) setAuthMode('reset-password');
```

The reset form validates matching passwords and minimum length before calling Supabase `updateUser`. The source of truth is `Client/src/App.jsx`.

## Stable local callback URL

`Client/vite.config.js` pins the local development server so password recovery URLs have a stable address:

```js
server: {
  host: 'localhost',
  port: 5173,
  strictPort: true,
},
```

In the Supabase project's Auth URL Configuration, allow `http://localhost:5173/main.html` as a Redirect URL. Keep the launcher running and open the email link on the same computer; localhost links cannot reach a stopped server or another device.

## One-click launcher

`launch_hope_erp.js` starts the Client's Vite development server. Vite opens the browser using its configured stable local URL. Rebuild `Hope_ERP_OneClick.exe` after changing this script.

## QA updates

- Updated the bundled smoke, role, guide, and module-coverage tests to use the current form IDs, navigation labels, and Sales tab names.
- Updated the independent Sprint 1 regression check to match the current last-Superadmin migration function name.
- Authentication and module tests use test accounts only; read-only role suites block ERP REST writes.

## Important database note

No Supabase database migration was applied. UI permission checks do not change RLS; the database remains the authority for ERP writes.
