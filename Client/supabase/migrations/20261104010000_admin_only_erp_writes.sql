-- ==========================================
-- Migration: Admin-Only Write Protection
-- File: 20261104010000_admin_only_erp_writes.sql
-- Description: Restricts INSERT, UPDATE, and DELETE actions
--              exclusively to administrator roles.
-- ==========================================

begin;

revoke all on public.app_profiles from public, anon;

do $$
declare
  table_name text;
  active_view text;
  select_permissions text;
  select_policy text;
begin
  for table_name, select_permissions in
    select * from (values
      ('customer', 'customers.view,reports.topCustomers,reports.topSales'),
      ('product', 'products.view,reports.productMaster,reports.topProducts,reports.topSales'),
      ('pricehist', 'products.view,reports.productMaster,reports.topProducts,reports.topSales'),
      ('employee', 'hr.view,sales.view,payments.view,reports.activeEmployees,reports.allEmployees,reports.empJobHistory,reports.topSales'),
      ('department', 'hr.view,reports.empJobHistory'),
      ('job', 'hr.view,reports.empJobHistory'),
      ('jobhistory', 'hr.view,reports.empJobHistory'),
      ('sales', 'sales.view,payments.view,reports.topCustomers,reports.topProducts,reports.topSales'),
      ('salesdetail', 'sales.view,reports.topCustomers,reports.topProducts,reports.topSales'),
      ('payment', 'payments.view')
    ) as tables(table_name, select_permissions)
  loop
    select_policy := (
      select string_agg(format('(select public.hope_has_permission(%L))', permission_name), ' or ')
      from unnest(string_to_array(select_permissions, ',')) as permissions(permission_name)
    );

    execute format('revoke all on public.%I from public, anon', table_name);
    execute format('revoke delete, truncate on public.%I from authenticated', table_name);
    execute format('grant select, insert, update on public.%I to authenticated', table_name);

    execute format('drop policy if exists hope_insert on public.%I', table_name);
    execute format('drop policy if exists hope_edit on public.%I', table_name);
    execute format('drop policy if exists hope_soft_delete on public.%I', table_name);
    execute format('drop policy if exists hope_admin_insert on public.%I', table_name);
    execute format('drop policy if exists hope_admin_update on public.%I', table_name);
    execute format('drop policy if exists hope_admin_write_guard on public.%I', table_name);
    execute format('drop policy if exists hope_admin_update_guard on public.%I', table_name);
    execute format('drop policy if exists hope_select_permission_guard on public.%I', table_name);

    execute format(
      'create policy hope_select_permission_guard on public.%I as restrictive for select to authenticated using ((%s) and (not is_deleted or (select public.hope_is_admin())))',
      table_name, select_policy
    );
    execute format(
      'create policy hope_admin_insert on public.%I for insert to authenticated with check ((select public.hope_is_admin()) and not is_deleted)',
      table_name
    );
    execute format(
      'create policy hope_admin_write_guard on public.%I as restrictive for insert to authenticated with check ((select public.hope_is_admin()) and not is_deleted)',
      table_name
    );
    execute format(
      'create policy hope_admin_update on public.%I for update to authenticated using ((select public.hope_is_admin())) with check ((select public.hope_is_admin()))',
      table_name
    );
    execute format(
      'create policy hope_admin_update_guard on public.%I as restrictive for update to authenticated using ((select public.hope_is_admin())) with check ((select public.hope_is_admin()))',
      table_name
    );

    active_view := table_name || '_active';
    if to_regclass(format('public.%I', active_view)) is not null then
      execute format('alter view public.%I set (security_invoker = true)', active_view);
      execute format('revoke all on public.%I from public, anon', active_view);
      execute format('grant select on public.%I to authenticated', active_view);
    end if;
  end loop;
end;
$$;

revoke all on public.audit_log from public, anon, authenticated;

commit;
