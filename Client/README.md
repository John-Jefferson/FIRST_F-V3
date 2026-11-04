# Hope, Inc. ERP Client

The client uses Supabase Auth for login, protected `app_profiles` for user roles and permissions, and Supabase for ERP business data. Database row-level security (RLS) is the source of truth: only active admins and superadmins can insert, edit, or soft-delete ERP rows. Regular users can only read tables/reports their assigned permissions allow.

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
2. `supabase/migrations/20261104010000_admin_only_erp_writes.sql` removes anonymous table access and restricts every ERP table write to active admins/superadmins.

Do not deploy the connected app or accept production writes until both migrations have succeeded. The existing project previously allowed anonymous table reads; the code changes alone do not close that access or install the new database policies.

The first Auth registration for `johnjefferson.leonardo@gmail.com` becomes the initial active superadmin if no superadmin profile exists. Register that address through the app and confirm its email. Other public registrations are pending until an administrator approves them. Configure the local and hosted Auth redirect URLs in Supabase Auth settings.

The sign-in form shows the initial Superadmin account email. Its password is the one chosen during Supabase Auth registration; it cannot be retrieved or displayed by the app. If that account has not been registered yet, use **Create an account** with this email and choose a password.

## Deploy account-management function

Creating or deleting Supabase Auth accounts requires the protected Edge Function at `supabase/functions/manage-user/index.ts`; do not put a service-role key in the browser. Install/configure the Supabase CLI for the project, set the Edge Function secret `SUPABASE_SERVICE_ROLE_KEY` through Supabase's secret management, and deploy:

```sh
supabase functions deploy manage-user
```

The function validates the caller's Auth JWT and active role from `app_profiles`. Admins can create/delete User accounts; only superadmins can create/delete or promote Admin/Superadmin accounts.

## ERP tables loaded

The app loads rows from `customer`, `product`, `pricehist`, `employee`, `department`, `job`, `jobhistory`, `sales`, `salesdetail`, and `payment`, including `is_deleted` and `stamp`. Data is paginated in stable primary-key order. Use **Refresh ERP data** to reload. Record deletion in the UI is a soft delete; the database blocks hard deletes.

Configure the project URL and browser-safe publishable/anon key in `Client/.env.local` and in the hosting provider. Never put a service-role key or database password in frontend environment variables.

## Build

```sh
npm run build
```
