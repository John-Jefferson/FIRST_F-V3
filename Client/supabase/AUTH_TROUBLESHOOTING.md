# Authentication & Local Environment Troubleshooting

## Localhost Redirect Configuration (Fixing 404 on Email Links)
When testing password resets or email confirmations locally via Vite:
1. Open **Supabase Dashboard > Authentication > URL Configuration**.
2. Set **Site URL** to `http://localhost:5173`.
3. Add `http://localhost:5173/**` to **Redirect URLs**.

## Email Rate Limits During Testing
- Repeated signup or recovery requests trigger Supabase's built-in email rate limiter.
- For local testing, either disable **Confirm email** under **Authentication > Providers > Email**, or insert test accounts directly via SQL with `email_confirmed_at = now()`.

## Account Approval Workflow
- If an account is stuck on the pending access screen, verify its `status` column in `public.app_profiles` is set to `'active'`.
- Sign out or clear browser `localStorage` if testing fresh login flows after updating a user's status.
