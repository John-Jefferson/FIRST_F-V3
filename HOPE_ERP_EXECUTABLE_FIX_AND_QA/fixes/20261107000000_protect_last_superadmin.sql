-- PROPOSED FIX. Review on a staging database before applying to production.
-- Block removing, demoting, or disabling the final active superadmin.
-- Works for direct UPDATE/DELETE of public.app_profiles and auth.users cascading deletion.
begin;
create or replace function public.hope_preserve_last_superadmin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_active integer;
  removes_active_superadmin boolean;
begin
  if old.role <> 'superadmin' or old.status <> 'active' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  removes_active_superadmin := tg_op = 'DELETE';
  if tg_op = 'UPDATE' then
    removes_active_superadmin := new.role <> 'superadmin' or new.status <> 'active';
  end if;
  if not removes_active_superadmin then
    return new;
  end if;
  -- Serialize concurrent transitions involving superadmin accounts.
  perform pg_catalog.pg_advisory_xact_lock(459001, 1);
  select count(*) into remaining_active
  from public.app_profiles
  where role = 'superadmin' and status = 'active' and id <> old.id;
  if remaining_active = 0 then
    raise exception 'Cannot remove or disable the last active superadmin'
      using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists hope_last_superadmin_guard on public.app_profiles;
create trigger hope_last_superadmin_guard
before update of role, status or delete on public.app_profiles
for each row execute function public.hope_preserve_last_superadmin();

revoke all on function public.hope_preserve_last_superadmin() from public, anon, authenticated;
commit;
