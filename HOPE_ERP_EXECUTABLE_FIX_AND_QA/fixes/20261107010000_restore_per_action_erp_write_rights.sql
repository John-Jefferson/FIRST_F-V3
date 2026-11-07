-- PROPOSED MIGRATION - STAGING ONLY UNTIL TESTED.
-- Supersedes admin-only business writes from migration 20261104010000.
-- Full permission-specific RLS plus hope_protect_soft_delete() trigger from first migration.
-- Do not apply to production without independently validating every right and the active-session guard.
begin;
do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('customer','customers.add','customers.edit','customers.delete'),
      ('product','products.add','products.edit','products.delete'),
      ('pricehist','products.priceAdd','products.priceEdit','products.priceDelete'),
      ('employee','hr.empAdd','hr.empEdit','hr.empDelete'),
      ('department','hr.deptAdd','hr.deptEdit','hr.deptDelete'),
      ('job','hr.jobAdd','hr.jobEdit','hr.jobDelete'),
      ('jobhistory','hr.jhAdd','hr.jhEdit','hr.jhDelete'),
      ('sales','sales.add','sales.edit','sales.delete'),
      ('salesdetail','sales.detailAdd','sales.detailEdit','sales.detailDelete'),
      ('payment','payments.add','payments.edit','payments.delete')
    ) as t(table_name,add_permission,edit_permission,delete_permission)
  loop
    execute format('drop policy if exists hope_admin_insert on public.%I', item.table_name);
    execute format('drop policy if exists hope_admin_update on public.%I', item.table_name);
    execute format('drop policy if exists hope_admin_write_guard on public.%I', item.table_name);
    execute format('drop policy if exists hope_admin_update_guard on public.%I', item.table_name);
    execute format(
      'create policy hope_insert on public.%I for insert to authenticated with check ((select public.hope_has_permission(%L)) and not is_deleted)',
      item.table_name,item.add_permission
    );
    execute format(
      'create policy hope_edit on public.%I for update to authenticated using ((select public.hope_has_permission(%L)) and not is_deleted) with check ((select public.hope_has_permission(%L)) and not is_deleted)',
      item.table_name,item.edit_permission,item.edit_permission
    );
    execute format(
      'create policy hope_soft_delete on public.%I for update to authenticated using ((select public.hope_has_permission(%L))) with check ((select public.hope_has_permission(%L)))',
      item.table_name,item.delete_permission,item.delete_permission
    );
    -- Existing BEFORE UPDATE trigger separately validates only the relevant edit/delete right.
    -- Retain the restrictive select policy to hide inactive rows from ordinary users.
  end loop;
end;
$$;
commit;
