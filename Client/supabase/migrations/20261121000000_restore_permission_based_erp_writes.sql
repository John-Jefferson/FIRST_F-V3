begin;

do $$
-- Rebuild each table's read/write policies from the table-specific permission map.
declare
  item record;
  select_policy text;
begin
  for item in
    select * from (values
      ('customer', 'customers.view,reports.topCustomers,reports.topSales', 'customers.add', 'customers.edit', 'customers.delete'),
      ('product', 'products.view,reports.productMaster,reports.topProducts,reports.topSales', 'products.add', 'products.edit', 'products.delete'),
      ('pricehist', 'products.view,reports.productMaster,reports.topProducts,reports.topSales', 'products.priceAdd', 'products.priceEdit', 'products.priceDelete'),
      ('employee', 'hr.view,sales.view,reports.activeEmployees,reports.allEmployees,reports.empJobHistory,reports.topSales', 'hr.empAdd', 'hr.empEdit', 'hr.empDelete'),
      ('department', 'hr.view,reports.empJobHistory', 'hr.deptAdd', 'hr.deptEdit', 'hr.deptDelete'),
      ('job', 'hr.view,reports.empJobHistory', 'hr.jobAdd', 'hr.jobEdit', 'hr.jobDelete'),
      ('jobhistory', 'hr.view,reports.empJobHistory', 'hr.jhAdd', 'hr.jhEdit', 'hr.jhDelete'),
      ('sales', 'sales.view,reports.topCustomers,reports.topProducts,reports.topSales', 'sales.add', 'sales.edit', 'sales.delete'),
      ('salesdetail', 'sales.view,reports.topCustomers,reports.topProducts,reports.topSales', 'sales.detailAdd', 'sales.detailEdit', 'sales.detailDelete')
    ) as tables(table_name, select_permissions, add_permission, edit_permission, delete_permission)
  loop
    if item.table_name = 'jobhistory' then
      select_policy := format(
        '(((select public.hope_has_permission(%L)) and (select public.hope_has_permission(%L))) or (select public.hope_has_permission(%L)))',
        'hr.view', 'hr.jhView', 'reports.empJobHistory'
      );
    elsif item.table_name = 'salesdetail' then
      select_policy := format(
        '(((select public.hope_has_permission(%L)) and (select public.hope_has_permission(%L))) or (select public.hope_has_permission(%L)) or (select public.hope_has_permission(%L)) or (select public.hope_has_permission(%L)))',
        'sales.view', 'sales.detailView', 'reports.topCustomers', 'reports.topProducts', 'reports.topSales'
      );
    else
      select_policy := (
        select string_agg(format('(select public.hope_has_permission(%L))', permission_name), ' or ')
        from unnest(string_to_array(item.select_permissions, ',')) as permissions(permission_name)
      );
    end if;

    execute format('revoke delete, truncate on public.%I from anon, authenticated', item.table_name);
    execute format('grant select, insert, update on public.%I to authenticated', item.table_name);

    execute format('drop policy if exists hope_select on public.%I', item.table_name);
    execute format('drop policy if exists hope_select_permission_guard on public.%I', item.table_name);
    execute format('drop policy if exists hope_admin_insert on public.%I', item.table_name);
    execute format('drop policy if exists hope_admin_write_guard on public.%I', item.table_name);
    execute format('drop policy if exists hope_admin_update on public.%I', item.table_name);
    execute format('drop policy if exists hope_admin_update_guard on public.%I', item.table_name);
    execute format('drop policy if exists hope_insert on public.%I', item.table_name);
    execute format('drop policy if exists hope_edit on public.%I', item.table_name);
    execute format('drop policy if exists hope_soft_delete on public.%I', item.table_name);
    execute format('drop policy if exists hope_permission_insert_guard on public.%I', item.table_name);
    execute format('drop policy if exists hope_permission_update_guard on public.%I', item.table_name);

    execute format(
      'create policy hope_select on public.%I for select to authenticated using ((%s) and (not is_deleted or (select public.hope_is_admin())))',
      item.table_name, select_policy
    );
    execute format(
      'create policy hope_select_permission_guard on public.%I as restrictive for select to authenticated using ((%s) and (not is_deleted or (select public.hope_is_admin())))',
      item.table_name, select_policy
    );
    execute format(
      'create policy hope_insert on public.%I for insert to authenticated with check ((select public.hope_has_permission(%L)) and not is_deleted)',
      item.table_name, item.add_permission
    );
    execute format(
      'create policy hope_permission_insert_guard on public.%I as restrictive for insert to authenticated with check ((select public.hope_has_permission(%L)) and not is_deleted)',
      item.table_name, item.add_permission
    );
    execute format(
      'create policy hope_edit on public.%I for update to authenticated using ((select public.hope_has_permission(%L)) and not is_deleted) with check ((select public.hope_has_permission(%L)) and not is_deleted)',
      item.table_name, item.edit_permission, item.edit_permission
    );
    execute format(
      'create policy hope_soft_delete on public.%I for update to authenticated using ((select public.hope_has_permission(%L))) with check ((select public.hope_has_permission(%L)))',
      item.table_name, item.delete_permission, item.delete_permission
    );
    execute format(
      'create policy hope_permission_update_guard on public.%I as restrictive for update to authenticated using (((select public.hope_has_permission(%L)) and not is_deleted) or (select public.hope_has_permission(%L))) with check (((select public.hope_has_permission(%L)) and not is_deleted) or (select public.hope_has_permission(%L)))',
      item.table_name, item.edit_permission, item.delete_permission, item.edit_permission, item.delete_permission
    );
  end loop;
end;
$$;

commit;
