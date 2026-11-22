# Database & Audit Logging Setup

## Overview
The Hope, Inc. ERP uses Supabase (PostgreSQL) for data persistence, authentication, and row-level security.

## User Profiles (`public.app_profiles`)
- **Roles:** `user`, `admin`, `superadmin`
- **Statuses:** `pending`, `active`, `blocked`, `disapproved`
- Newly registered accounts in `auth.users` trigger `public.handle_new_user()` to populate their corresponding profile record.

## Audit Logging (`S1-DBA-06`)
- **Table:** `public.audit_logs`
- **Trigger Function:** `public.audit_user_action()`
- Tracks `INSERT`, `UPDATE`, and `DELETE` operations across monitored tables, recording `table_name`, `action`, `record_id`, `performed_by`, and JSON snapshots (`old_data` / `new_data`).
- Row Level Security (RLS) is enabled on `public.audit_logs` to restrict unauthorized modifications.
