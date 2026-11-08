begin;

create or replace function public.hope_protect_last_superadmin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_check boolean := false;
begin
  if old.role = 'superadmin' and old.status = 'active' then
    if tg_op = 'DELETE' then
      should_check := true;
    elsif new.role is distinct from 'superadmin'
       or new.status is distinct from 'active' then
      should_check := true;
    end if;
  end if;

  if should_check then
    perform pg_catalog.pg_advisory_xact_lock(20261108, 1);

    if not exists (
      select 1
      from public.app_profiles
      where role = 'superadmin'
        and status = 'active'
    ) then
      raise exception
        'The last active Superadmin cannot be removed, demoted, or disabled.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.hope_protect_last_superadmin()
from public, anon, authenticated;

drop trigger if exists hope_protect_last_superadmin
on public.app_profiles;

create constraint trigger hope_protect_last_superadmin
after update or delete on public.app_profiles
deferrable initially deferred
for each row
execute function public.hope_protect_last_superadmin();

commit;