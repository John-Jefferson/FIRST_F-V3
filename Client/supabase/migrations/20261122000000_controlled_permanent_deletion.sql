begin;

-- HopeWeb archives parent rows without requiring their related history to be archived too.
do $$
declare
  item record;
begin
  for item in
    select trigger_row.tgname, trigger_row.tgrelid::regclass as table_name
    from pg_trigger trigger_row
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    join pg_proc function_row on function_row.oid = trigger_row.tgfoid
    where schema_row.nspname = 'public'
      and table_row.relname in (
        'customer', 'product', 'pricehist', 'employee', 'department',
        'job', 'jobhistory', 'sales', 'salesdetail'
      )
      and not trigger_row.tgisinternal
      and function_row.proname = 'trg_check_children'
  loop
    execute format('drop trigger %I on %s', item.tgname, item.table_name);
  end loop;
end;
$$;

-- Direct hard deletes remain blocked; the server-side RPC sets this transaction-local flag.
create or replace function public.trg_block_hard_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and current_setting('app.allow_erp_hard_delete', true) = 'on' then
    return old;
  end if;
  raise exception 'Hard delete/truncate not allowed on %. Use the controlled permanent-delete action.', tg_table_name;
end;
$$;

create table if not exists public.erp_permanent_delete_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_key jsonb not null,
  deleted_count integer not null default 1,
  deleted_at timestamptz not null default now()
);

alter table public.erp_permanent_delete_audit enable row level security;
revoke all on public.erp_permanent_delete_audit from public, anon, authenticated;

create or replace function public.hard_delete_erp_records(p_actor uuid, p_records jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  record_table text;
  record_key jsonb;
  affected integer;
  deleted_count integer := 0;
begin
  if p_actor is null or p_records is null or jsonb_typeof(p_records) is distinct from 'array' then
    raise exception 'Invalid permanent-delete request.';
  end if;
  if jsonb_array_length(p_records) = 0 or jsonb_array_length(p_records) > 501 then
    raise exception 'Invalid permanent-delete request.';
  end if;

  perform set_config('app.allow_erp_hard_delete', 'on', true);

  for item in
    select value
    from jsonb_array_elements(p_records) with ordinality as records(value, position)
    order by (value ->> 'depth')::integer desc, position desc
  loop
    record_table := item ->> 'table';
    record_key := item -> 'key';
    if jsonb_typeof(record_key) is distinct from 'object' then
      raise exception 'Invalid record key for %.', record_table;
    end if;

    case record_table
      when 'customer' then
        delete from public.customer as target
        using jsonb_populate_record(null::public.customer, record_key) as key
        where target.custno = key.custno;
      when 'product' then
        delete from public.product as target
        using jsonb_populate_record(null::public.product, record_key) as key
        where target.prodcode = key.prodcode;
      when 'pricehist' then
        delete from public.pricehist as target
        using jsonb_populate_record(null::public.pricehist, record_key) as key
        where target.prodcode = key.prodcode and target.effdate = key.effdate;
      when 'employee' then
        delete from public.employee as target
        using jsonb_populate_record(null::public.employee, record_key) as key
        where target.empno = key.empno;
      when 'department' then
        delete from public.department as target
        using jsonb_populate_record(null::public.department, record_key) as key
        where target.deptcode = key.deptcode;
      when 'job' then
        delete from public.job as target
        using jsonb_populate_record(null::public.job, record_key) as key
        where target.jobcode = key.jobcode;
      when 'jobhistory' then
        delete from public.jobhistory as target
        using jsonb_populate_record(null::public.jobhistory, record_key) as key
        where target.empno = key.empno
          and target.jobcode = key.jobcode
          and target.effdate = key.effdate;
      when 'sales' then
        delete from public.sales as target
        using jsonb_populate_record(null::public.sales, record_key) as key
        where target.transno = key.transno;
      when 'salesdetail' then
        delete from public.salesdetail as target
        using jsonb_populate_record(null::public.salesdetail, record_key) as key
        where target.transno = key.transno and target.prodcode = key.prodcode;
      else
        raise exception 'Permanent deletion is not supported for table %.', record_table;
    end case;

    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'Expected one % row to be deleted; found %.', record_table, affected;
    end if;

    insert into public.erp_permanent_delete_audit (actor_id, table_name, record_key)
    values (p_actor, record_table, record_key);
    deleted_count := deleted_count + 1;
  end loop;

  return deleted_count;
end;
$$;

revoke all on function public.hard_delete_erp_records(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.hard_delete_erp_records(uuid, jsonb) to service_role;

commit;
