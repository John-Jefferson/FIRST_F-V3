# Hope, Inc. ERP Client

The client uses Supabase Auth for login, protected `app_profiles` for user roles and permissions, and Supabase as the shared source of ERP business data. Database row-level security (RLS) is the source of truth: active users can read and make changes only when their assigned permissions allow it; admins and superadmins have full access.

`hopeWeb.html` stores its sample records and demo accounts in browser local storage. That data is not automatically shared with this app or copied into Supabase. Accounts in this app must be real Supabase Auth accounts; existing business records must be in the Supabase tables loaded below.

## Configure and run

Create `Client/.env.local` with the project URL and the browser-safe publishable (or legacy anon) key:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

For local development:

```sh
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173/main.html`. Set the same variables in the hosting provider before building/deploying. Never put a Supabase service-role key or database password in this client.

## Apply database security

In the Supabase SQL Editor, run these migrations in timestamp order using an authorized project account:

1. `supabase/migrations/20261104000000_secure_erp_access.sql` creates protected profiles, role helpers, signup/bootstrap behavior, audit identity, and baseline RLS.
2. `supabase/migrations/20261104010000_admin_only_erp_writes.sql` removes anonymous table access and applies a temporary admin-only write policy.
3. `supabase/migrations/20261121000000_restore_permission_based_erp_writes.sql` restores the per-action permissions used by `hopeWeb.html`, enforced by RLS.
4. `supabase/migrations/20261122000000_controlled_permanent_deletion.sql` allows parent soft deletes with retained history and adds an audited, server-only hard-delete RPC.
5. `supabase/migrations/20261122010000_allow_confirmed_payment_deletion.sql` lets the confirmed delete flow remove linked legacy payments in the same transaction.

For a new database, apply all five migrations in timestamp order. If earlier migrations are already applied, apply the missing migrations in order. Do not deploy the connected app or accept production writes until the migrations have succeeded. The existing project previously allowed anonymous table reads; the code changes alone do not close that access or install the new database policies.

The first Auth registration for `johnjefferson.leonardo@gmail.com` becomes the initial active superadmin if no superadmin profile exists. Register that address through the app and confirm its email. Other public registrations are pending until an administrator approves them. On approval, a User with no existing permissions receives the same starter permissions as `hopeWeb.html`; admins can then adjust them in User Management. Existing active accounts with no permissions need an admin to assign rights there. Configure the local and hosted Auth redirect URLs in Supabase Auth settings.

The sign-in form shows the initial Superadmin account email. Its password is the one chosen during Supabase Auth registration; it cannot be retrieved or displayed by the app. If that account has not been registered yet, use **Create an account** with this email and choose a password.

## Deploy account-management function

Creating or deleting Supabase Auth accounts requires the protected Edge Function at `supabase/functions/manage-user/index.ts`; do not put a service-role key in the browser. Install/configure the Supabase CLI for the project, set the Edge Function secret `SUPABASE_SERVICE_ROLE_KEY` through Supabase's secret management, and deploy:

```sh
supabase functions deploy manage-user
```

Redeploy this function after updating its code so account approvals apply the starter permission set.

The function validates the caller's Auth JWT and active role from `app_profiles`. Admins can create/delete User accounts; only superadmins can create/delete or promote Admin/Superadmin accounts.

## Deploy permanent-delete function

Permanent deletion is separate from the existing soft-delete action. The impact preview and deletion endpoint use the server-only service-role secret; never expose that secret in the client. After applying the database migrations, deploy:

```sh
supabase functions deploy permanently-delete
```

The function checks the caller's existing delete permission for the selected record. That permission covers its related records, which users must review and select before the dependency set is removed in one database transaction. Linked legacy `payment` rows are included in the impact preview and permanently deleted with their sale.

## ERP tables loaded

The app loads rows from `customer`, `product`, `pricehist`, `employee`, `department`, `job`, `jobhistory`, `sales`, and `salesdetail`, including `is_deleted` and `stamp`. These are the records used by the customer, product, HR, sales, and reporting features in `hopeWeb.html`. Data is paginated in stable primary-key order. Use **Refresh ERP data** to reload. **Delete** marks a record inactive and retains it in history. **Delete permanently** first previews related records, uses the selected record's delete permission for its related rows, and removes the selected set atomically, including linked payments.

Configure the project URL and browser-safe publishable/anon key in `Client/.env.local` and in the hosting provider. Never put a service-role key or database password in frontend environment variables.

## Build

```sh
npm run build
```
