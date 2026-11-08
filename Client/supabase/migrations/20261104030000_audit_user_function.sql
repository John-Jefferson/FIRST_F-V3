-- ==========================================
-- Migration: Audit User Function & Trigger
-- File: 20261104030000_audit_user_function.sql
-- Description: Creates an audit logging function and table 
--              to track administrative and user data mutations.
-- ==========================================

begin;

-- 1. Create the audit logs table if it doesn't exist
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  action text not null,
  record_id uuid,
  performed_by uuid references auth.users(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS on audit logs
alter table public.audit_logs enable row level security;

-- Lock down default permissions
revoke all on public.audit_logs from public, anon, authenticated;

-- Allow admins full access, or service role
grant select, insert on public.audit_logs to authenticated;

-- RLS Policy for Audit Logs (Only admins can view audit logs)
drop policy if exists hope_audit_logs_admin_guard on public.audit_logs;
create policy hope_audit_logs_admin_guard
on public.audit_logs for all to authenticated
using ((select public.hope_is_admin()))
with check ((select public.hope_is_admin()));

-- 2. Create the core audit logging function (audit_user / generic audit logger)
create or replace function public.audit_user_action()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    table_name,
    action,
    record_id,
    performed_by,
    old_data,
    new_data
  )
  values (
    TG_TABLE_NAME,
    TG_OP,
    coalesce(NEW.id, OLD.id),
    auth.uid(),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
  );
  
  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

-- 3. (Optional Convenience) Attach the trigger to a sensitive table like app_profiles or profiles 
-- if your project tracks user record changes. 
-- Uncomment below if you want it active on your profile/user table:
/*
drop trigger if exists trg_audit_app_profiles on public.app_profiles;
create trigger trg_audit_app_profiles
  after insert or update or delete on public.app_profiles
  for each row execute function public.audit_user_action();
*/

commit;
