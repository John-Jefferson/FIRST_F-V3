begin;

-- Audit logs are readable by admins, but clients cannot modify them.
revoke all on public.audit_logs from public, anon, authenticated;
grant select on public.audit_logs to authenticated;

drop policy if exists hope_audit_logs_admin_guard on public.audit_logs;
create policy hope_audit_logs_admin_read
on public.audit_logs
for select
to authenticated
using ((select public.hope_is_admin()));

-- Safely record INSERT, UPDATE, and DELETE operations.
create or replace function public.audit_user_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_logs (
      table_name, action, record_id, performed_by, old_data, new_data
    )
    values (
      TG_TABLE_NAME, TG_OP, NEW.id, auth.uid(), null, to_jsonb(NEW)
    );
    return NEW;

  elsif TG_OP = 'UPDATE' then
    insert into public.audit_logs (
      table_name, action, record_id, performed_by, old_data, new_data
    )
    values (
      TG_TABLE_NAME, TG_OP, NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW)
    );
    return NEW;

  elsif TG_OP = 'DELETE' then
    insert into public.audit_logs (
      table_name, action, record_id, performed_by, old_data, new_data
    )
    values (
      TG_TABLE_NAME, TG_OP, OLD.id, auth.uid(), to_jsonb(OLD), null
    );
    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_audit_app_profiles on public.app_profiles;

create trigger trg_audit_app_profiles
after insert or update or delete on public.app_profiles
for each row
execute function public.audit_user_action();

commit;
