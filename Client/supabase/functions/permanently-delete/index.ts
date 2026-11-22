import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_IMPACT_ROWS = 500;
const TABLES = {
  customer: { keys: ['custno'], permission: 'customers.delete' },
  product: { keys: ['prodcode'], permission: 'products.delete' },
  pricehist: { keys: ['effdate', 'prodcode'], permission: 'products.priceDelete' },
  employee: { keys: ['empno'], permission: 'hr.empDelete' },
  department: { keys: ['deptcode'], permission: 'hr.deptDelete' },
  job: { keys: ['jobcode'], permission: 'hr.jobDelete' },
  jobhistory: { keys: ['empno', 'jobcode', 'effdate'], permission: 'hr.jhDelete' },
  sales: { keys: ['transno'], permission: 'sales.delete' },
  salesdetail: { keys: ['transno', 'prodcode'], permission: 'sales.detailDelete' },
} as const;

const RELATIONSHIPS = [
  { parent: 'customer', child: 'sales', parentKey: 'custno', childKey: 'custno' },
  { parent: 'product', child: 'pricehist', parentKey: 'prodcode', childKey: 'prodcode' },
  { parent: 'product', child: 'salesdetail', parentKey: 'prodcode', childKey: 'prodcode' },
  { parent: 'employee', child: 'jobhistory', parentKey: 'empno', childKey: 'empno' },
  { parent: 'employee', child: 'sales', parentKey: 'empno', childKey: 'empno' },
  { parent: 'department', child: 'jobhistory', parentKey: 'deptcode', childKey: 'deptcode' },
  { parent: 'job', child: 'jobhistory', parentKey: 'jobcode', childKey: 'jobcode' },
  { parent: 'sales', child: 'salesdetail', parentKey: 'transno', childKey: 'transno' },
];

type TableName = keyof typeof TABLES;
type RecordKey = Record<string, string | number>;
type Profile = { role: string; status: string; permissions: string[] | null };
type ImpactRecord = {
  id: string;
  table: TableName;
  key: RecordKey;
  label: string;
  isDeleted: boolean;
  depth: number;
  permission: string;
  canDelete: boolean;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isTableName(value: unknown): value is TableName {
  return typeof value === 'string' && Object.hasOwn(TABLES, value);
}

function parseKey(table: TableName, value: unknown): RecordKey | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const key = value as Record<string, unknown>;
  const expected = TABLES[table].keys;
  if (Object.keys(key).length !== expected.length || expected.some((field) => key[field] === undefined || key[field] === null)) {
    return null;
  }
  if (Object.keys(key).some((field) => !expected.some((expectedField) => expectedField === field))) return null;
  if (expected.some((field) => !['string', 'number'].includes(typeof key[field]))) return null;
  return key as RecordKey;
}

function canDelete(profile: Profile, table: TableName) {
  return profile.role === 'admin' || profile.role === 'superadmin'
    || Boolean(profile.permissions?.includes(TABLES[table].permission));
}

function rowKey(table: TableName, row: Record<string, unknown>): RecordKey {
  return Object.fromEntries(TABLES[table].keys.map((field) => [field, row[field] as string | number]));
}

function rowLabel(table: TableName, row: Record<string, unknown>, key: RecordKey) {
  switch (table) {
    case 'customer': return String(row.custname || key.custno);
    case 'product': return String(row.description || key.prodcode);
    case 'pricehist': return `${key.prodcode} · ${key.effdate}`;
    case 'employee': return `${row.firstname || ''} ${row.lastname || ''}`.trim() || String(key.empno);
    case 'department': return String(row.deptname || key.deptcode);
    case 'job': return String(row.jobdesc || key.jobcode);
    case 'jobhistory': return `${key.empno} · ${key.jobcode} · ${key.effdate}`;
    case 'sales': return `Transaction ${key.transno}`;
    case 'salesdetail': return `Transaction ${key.transno} · Product ${key.prodcode}`;
  }
}

async function loadImpact(client: ReturnType<typeof createClient>, table: TableName, key: RecordKey, profile: Profile) {
  const { data: root, error: rootError } = await client.from(table).select('*').match(key).maybeSingle();
  if (rootError) throw new Error(`Could not load ${table} record: ${rootError.message}`);
  if (!root) throw new Error('This record no longer exists. Refresh and try again.');

  const rootKey = rowKey(table, root);
  const rootRecord = {
    table,
    key: rootKey,
    label: rowLabel(table, root, rootKey),
    isDeleted: Boolean(root.is_deleted),
    permission: TABLES[table].permission,
    canDelete: canDelete(profile, table),
  };
  const records: ImpactRecord[] = [];
  const blockers: { table: 'payment'; count: number; message: string }[] = [];
  const visited = new Set<string>();
  const queue = [{ table, key: rootKey, depth: 0 }];

  while (queue.length) {
    const parent = queue.shift()!;
    if (parent.table === 'sales') {
      const { count, error } = await client.from('payment')
        .select('transno', { count: 'exact', head: true })
        .eq('transno', parent.key.transno);
      if (error) throw new Error(`Could not check linked payment records: ${error.message}`);
      if (count) blockers.push({
        table: 'payment',
        count,
        message: 'Payment records are retained; this sale cannot be permanently deleted while they exist.',
      });
    }

    for (const relationship of RELATIONSHIPS.filter((item) => item.parent === parent.table)) {
      const { count, data, error } = await client.from(relationship.child)
        .select('*', { count: 'exact' })
        .eq(relationship.childKey, parent.key[relationship.parentKey])
        .range(0, MAX_IMPACT_ROWS);
      if (error) throw new Error(`Could not check related ${relationship.child} records: ${error.message}`);
      if ((count || 0) > MAX_IMPACT_ROWS || records.length + (data?.length || 0) > MAX_IMPACT_ROWS) {
        throw new Error(`This record has more than ${MAX_IMPACT_ROWS} related records. Ask an administrator to review it; nothing was deleted.`);
      }

      for (const row of data || []) {
        const child = relationship.child as TableName;
        const childKey = rowKey(child, row);
        const id = JSON.stringify({ table: child, key: childKey });
        if (visited.has(id)) continue;
        visited.add(id);
        records.push({
          id,
          table: child,
          key: childKey,
          label: rowLabel(child, row, childKey),
          isDeleted: Boolean(row.is_deleted),
          depth: parent.depth + 1,
          permission: TABLES[child].permission,
          canDelete: canDelete(profile, child),
        });
        queue.push({ table: child, key: childKey, depth: parent.depth + 1 });
      }
    }
  }
  return { root: rootRecord, records, blockers };
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed.' });

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return jsonResponse(401, { error: 'Authentication required.' });

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Permanent deletion is not configured.' });
  }

  const token = authorization.slice('Bearer '.length);
  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return jsonResponse(401, { error: 'Your session is invalid or expired.' });

  const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: profile, error: profileError } = await adminClient
    .from('app_profiles').select('role, status, permissions').eq('id', authData.user.id).single();
  if (profileError || profile?.status !== 'active') {
    return jsonResponse(403, { error: 'An active account is required.' });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Request body must be valid JSON.' });
  }
  if (!isTableName(payload.table)) return jsonResponse(400, { error: 'Unsupported record type.' });
  const table = payload.table;
  const key = parseKey(table, payload.key);
  if (!key) return jsonResponse(400, { error: 'The record key is invalid.' });
  if (!canDelete(profile, table)) return jsonResponse(403, { error: `Your account needs ${TABLES[table].permission} permission.` });

  try {
    const impact = await loadImpact(adminClient, table, key, profile);
    if (payload.action === 'preview') return jsonResponse(200, impact);
    if (payload.action !== 'delete') return jsonResponse(400, { error: 'Unsupported action.' });

    if (impact.blockers.length) {
      return jsonResponse(409, { error: impact.blockers.map((item) => `${item.count} ${item.table} record(s) must be retained.`).join(' ') });
    }
    const selectedIds = Array.isArray(payload.selectedIds) ? payload.selectedIds : [];
    if (selectedIds.length !== impact.records.length || impact.records.some((item) => !selectedIds.includes(item.id))) {
      return jsonResponse(409, { error: 'Related records changed or were not all selected. Review the impact list again.' });
    }
    const unauthorized = impact.records.find((item) => !item.canDelete);
    if (unauthorized) {
      return jsonResponse(403, { error: `Your account needs ${unauthorized.permission} permission to remove the linked ${unauthorized.table} record.` });
    }

    const records = [
      ...impact.records.map(({ table: recordTable, key: recordKey, depth }) => ({ table: recordTable, key: recordKey, depth })),
      { table, key, depth: 0 },
    ];
    const { data: deletedCount, error: deleteError } = await adminClient.rpc('hard_delete_erp_records', {
      p_actor: authData.user.id,
      p_records: records,
    });
    if (deleteError) return jsonResponse(409, { error: `Permanent deletion failed; no records were removed: ${deleteError.message}` });
    return jsonResponse(200, { deletedCount });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : 'Could not load the deletion impact.' });
  }
});
