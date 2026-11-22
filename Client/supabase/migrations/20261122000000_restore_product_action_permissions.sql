begin;


drop policy if exists hope_admin_insert on public.customer;
drop policy if exists hope_admin_update on public.customer;
drop policy if exists hope_admin_write_guard on public.customer;
drop policy if exists hope_admin_update_guard on public.customer;


drop policy if exists hope_admin_insert on public.product;
drop policy if exists hope_admin_update on public.product;
drop policy if exists hope_admin_write_guard on public.product;
drop policy if exists hope_admin_update_guard on public.product;


drop policy if exists hope_admin_insert on public.pricehist;
drop policy if exists hope_admin_update on public.pricehist;
drop policy if exists hope_admin_write_guard on public.pricehist;
drop policy if exists hope_admin_update_guard on public.pricehist;


create policy hope_insert
on public.customer
for insert
to authenticated
with check (
  (select public.hope_has_permission('customers.add'))
  and not is_deleted
);


create policy hope_edit
on public.customer
for update
to authenticated
using (
  (select public.hope_has_permission('customers.edit'))
  and not is_deleted
)
with check (
  (select public.hope_has_permission('customers.edit'))
  and not is_deleted
);


create policy hope_soft_delete
on public.customer
for update
to authenticated
using (
  (select public.hope_has_permission('customers.delete'))
)
with check (
  (select public.hope_has_permission('customers.delete'))
);


create policy hope_insert
on public.product
for insert
to authenticated
with check (
  (select public.hope_has_permission('products.add'))
  and not is_deleted
);


create policy hope_edit
on public.product
for update
to authenticated
using (
  (select public.hope_has_permission('products.edit'))
  and not is_deleted
)
with check (
  (select public.hope_has_permission('products.edit'))
  and not is_deleted
);


create policy hope_soft_delete
on public.product
for update
to authenticated
using (
  (select public.hope_has_permission('products.delete'))
)
with check (
  (select public.hope_has_permission('products.delete'))
);


create policy hope_insert
on public.pricehist
for insert
to authenticated
with check (
  (select public.hope_has_permission('products.priceAdd'))
  and not is_deleted
);


create policy hope_edit
on public.pricehist
for update
to authenticated
using (
  (select public.hope_has_permission('products.priceEdit'))
  and not is_deleted
)
with check (
  (select public.hope_has_permission('products.priceEdit'))
  and not is_deleted
);


create policy hope_soft_delete
on public.pricehist
for update
to authenticated
using (
  (select public.hope_has_permission('products.priceDelete'))
)
with check (
  (select public.hope_has_permission('products.priceDelete'))
);

commit;