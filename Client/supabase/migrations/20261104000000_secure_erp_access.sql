begin;

create table if not exists public.app_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin', 'superadmin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'blocked', 'disapproved')),
  permissions jsonb not null default '[]'::jsonb check (jsonb_typeof(permissions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_profiles enable row level security;
revoke all on public.app_profiles from public, anon, authenticated;
grant select, update on public.app_profiles to authenticated;

create or replace function public.hope_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
  );
$$;

create or replace function public.hope_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and p.role in ('admin', 'superadmin')
  );
$$;

create or replace function public.hope_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and p.role = 'superadmin'
  );
$$;

create or replace function public.hope_has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and (
        p.role in ('admin', 'superadmin')
        or p.permissions ? permission_name
      )
  );
$$;

revoke all on function public.hope_is_active() from public, anon;
revoke all on function public.hope_is_admin() from public, anon;
revoke all on function public.hope_is_superadmin() from public, anon;
revoke all on function public.hope_has_permission(text) from public, anon;
grant execute on function public.hope_is_active() to authenticated;
grant execute on function public.hope_is_active() to anon;
grant execute on function public.hope_is_admin() to authenticated;
grant execute on function public.hope_is_superadmin() to authenticated;
grant execute on function public.hope_has_permission(text) to authenticated;

drop policy if exists app_profiles_select on public.app_profiles;
create policy app_profiles_select
on public.app_profiles for select to authenticated
using (id = (select auth.uid()) or (select public.hope_is_admin()));

drop policy if exists app_profiles_admin_update on public.app_profiles;
create policy app_profiles_admin_update
on public.app_profiles for update to authenticated
using (
  (select public.hope_is_superadmin())
  or ((select public.hope_is_admin()) and role = 'user')
)
with check (
  (select public.hope_is_superadmin())
  or ((select public.hope_is_admin()) and role = 'user')
);

create or replace function public.hope_protect_profile_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.id is distinct from new.id or old.email is distinct from new.email then
    raise exception 'Profile identity must be changed through Supabase Auth'
      using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists hope_protect_profile_identity on public.app_profiles;
create trigger hope_protect_profile_identity
before update on public.app_profiles
for each row execute function public.hope_protect_profile_identity();

create or replace function public.hope_create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role text := 'user';
  new_status text := 'pending';
begin
  if lower(new.email) = 'johnjefferson.leonardo@gmail.com'
     and not exists (
       select 1 from public.app_profiles p where p.role = 'superadmin'
     ) then
    new_role := 'superadmin';
    new_status := 'active';
  end if;

  insert into public.app_profiles (id, email, first_name, last_name, role, status)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new_role,
    new_status
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists hope_create_profile_after_signup on auth.users;
create trigger hope_create_profile_after_signup
after insert on auth.users
for each row execute function public.hope_create_profile_for_auth_user();

create or replace function public.hope_set_app_username()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform set_config(
    'app.username',
    coalesce((select auth.jwt() ->> 'email'), (select auth.uid())::text, current_user),
    true
  );
  return new;
end;
$$;

create or replace function public.hope_protect_soft_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.stamp is distinct from new.stamp then
    raise exception 'stamp is maintained by the audit trigger'
      using errcode = '42501';
  end if;

  if old.is_deleted is distinct from new.is_deleted then
    if (to_jsonb(old) - 'is_deleted' - 'stamp')
       is distinct from (to_jsonb(new) - 'is_deleted' - 'stamp')
       or not (select public.hope_has_permission(tg_argv[1])) then
      raise exception 'Soft delete or restore requires its permission and may only change is_deleted'
        using errcode = '42501';
    end if;
  elsif (to_jsonb(old) - 'is_deleted' - 'stamp')
        is distinct from (to_jsonb(new) - 'is_deleted' - 'stamp')
        and not (select public.hope_has_permission(tg_argv[0])) then
    raise exception 'Editing this record requires its edit permission'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
declare
  item record;
  table_name text;
  select_permissions text;
  add_permission text;
  edit_permission text;
  delete_permission text;
  select_policy text;
begin
  for item in
    select * from (values
      ('customer', 'customers.view,reports.topCustomers,reports.topSales', 'customers.add', 'customers.edit', 'customers.delete'),
      ('product', 'products.view,reports.productMaster,reports.topProducts,reports.topSales', 'products.add', 'products.edit', 'products.delete'),
      ('pricehist', 'products.view,reports.productMaster,reports.topProducts,reports.topSales', 'products.priceAdd', 'products.priceEdit', 'products.priceDelete'),
      ('employee', 'hr.view,sales.view,payments.view,reports.activeEmployees,reports.allEmployees,reports.empJobHistory,reports.topSales', 'hr.empAdd', 'hr.empEdit', 'hr.empDelete'),
      ('department', 'hr.view,reports.empJobHistory', 'hr.deptAdd', 'hr.deptEdit', 'hr.deptDelete'),
      ('job', 'hr.view,reports.empJobHistory', 'hr.jobAdd', 'hr.jobEdit', 'hr.jobDelete'),
      ('jobhistory', 'hr.view,reports.empJobHistory', 'hr.jhAdd', 'hr.jhEdit', 'hr.jhDelete'),
      ('sales', 'sales.view,payments.view,reports.topCustomers,reports.topProducts,reports.topSales', 'sales.add', 'sales.edit', 'sales.delete'),
      ('salesdetail', 'sales.view,reports.topCustomers,reports.topProducts,reports.topSales', 'sales.detailAdd', 'sales.detailEdit', 'sales.detailDelete'),
      ('payment', 'payments.view', 'payments.add', 'payments.edit', 'payments.delete')
    ) as tables(table_name, select_permissions, add_permission, edit_permission, delete_permission)
  loop
    table_name := item.table_name;
    select_permissions := item.select_permissions;
    add_permission := item.add_permission;
    edit_permission := item.edit_permission;
    delete_permission := item.delete_permission;
    select_policy := (
      select string_agg(format('(select public.hope_has_permission(%L))', permission_name), ' or ')
      from unnest(string_to_array(select_permissions, ',')) as permissions(permission_name)
    );

    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke delete, truncate on public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update on public.%I to authenticated', table_name);

    execute format('drop policy if exists hope_active_session_guard on public.%I', table_name);
    execute format(
      'create policy hope_active_session_guard on public.%I as restrictive for all to public using ((select public.hope_is_active())) with check ((select public.hope_is_active()))',
      table_name
    );

    execute format('drop policy if exists hope_select on public.%I', table_name);
    execute format(
      'create policy hope_select on public.%I for select to authenticated using ((%s) and (not is_deleted or (select public.hope_is_admin())))',
      table_name, select_policy
    );

    execute format('drop policy if exists hope_insert on public.%I', table_name);
    execute format(
      'create policy hope_insert on public.%I for insert to authenticated with check ((select public.hope_has_permission(%L)) and not is_deleted)',
      table_name, add_permission
    );

    execute format('drop policy if exists hope_edit on public.%I', table_name);
    execute format(
      'create policy hope_edit on public.%I for update to authenticated using ((select public.hope_has_permission(%L)) and not is_deleted) with check ((select public.hope_has_permission(%L)) and not is_deleted)',
      table_name, edit_permission, edit_permission
    );

    execute format('drop policy if exists hope_soft_delete on public.%I', table_name);
    execute format(
      'create policy hope_soft_delete on public.%I for update to authenticated using ((select public.hope_has_permission(%L))) with check ((select public.hope_has_permission(%L)))',
      table_name, delete_permission, delete_permission
    );

    execute format('drop trigger if exists aaa_hope_set_app_username on public.%I', table_name);
    execute format(
      'create trigger aaa_hope_set_app_username before insert or update on public.%I for each row execute function public.hope_set_app_username()',
      table_name
    );

    execute format('drop trigger if exists aab_hope_protect_soft_delete on public.%I', table_name);
    execute format(
      'create trigger aab_hope_protect_soft_delete before update on public.%I for each row execute function public.hope_protect_soft_delete(%L, %L)',
      table_name, edit_permission, delete_permission
    );
  end loop;
end;
$$;

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;

commit;
