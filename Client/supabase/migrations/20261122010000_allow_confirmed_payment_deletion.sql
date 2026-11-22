begin;

alter table public.erp_permanent_delete_audit
  add column if not exists deleted_count integer not null default 1;

create or replace function public.hard_delete_erp_records_with_payments(p_actor uuid, p_records jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  transaction_number public.sales.transno%type;
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
    where value ->> 'table' = 'sales'
    order by position
  loop
    if jsonb_typeof(item -> 'key') is distinct from 'object'
       or (item -> 'key' ->> 'transno') is null then
      raise exception 'Invalid sales record key.';
    end if;
    transaction_number := item -> 'key' ->> 'transno';

    delete from public.payment
    where transno = transaction_number;
    get diagnostics affected = row_count;
    if affected > 0 then
      insert into public.erp_permanent_delete_audit (actor_id, table_name, record_key, deleted_count)
      values (
        p_actor,
        'payment',
        jsonb_build_object('transno', transaction_number),
        affected
      );
      deleted_count := deleted_count + affected;
    end if;
  end loop;

  return deleted_count + public.hard_delete_erp_records(p_actor, p_records);
end;
$$;

revoke all on function public.hard_delete_erp_records_with_payments(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.hard_delete_erp_records_with_payments(uuid, jsonb) to service_role;

notify pgrst, 'reload schema';

commit;
