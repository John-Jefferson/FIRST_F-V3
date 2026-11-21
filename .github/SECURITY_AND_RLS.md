# Security, Row Level Security & Status Reference

## Row Level Security (RLS)
- Database authorization is enforced in Supabase PostgreSQL via RLS policies rather than relying solely on frontend UI checks.
- `public.audit_logs` has RLS enabled and records `INSERT`, `UPDATE`, and `DELETE` activity through `public.audit_user_action()`.
- UI permission checks in `Client/src/App.jsx` (`ERP_WRITE_PERMISSIONS`) guard controls and actions on the client side, while the database remains the authority for writes.

## Profile Status & Role Constraints
- `app_profiles_status_check` allows: `pending`, `active`, `blocked`, and `disapproved`.
- Default `status` on `public.app_profiles` is set to `active` for streamlined onboarding.
- `app_profiles_role_check` allows: `user`, `admin`, and `superadmin`, paired with last-superadmin protection (`protect_last_superadmin`).
