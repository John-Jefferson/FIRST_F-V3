import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
    return jsonResponse(500, { error: 'User management function is not configured.' });
  }

  const token = authorization.slice('Bearer '.length);
  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return jsonResponse(401, { error: 'Your session is invalid or expired.' });

  const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: actor, error: actorError } = await adminClient
    .from('app_profiles')
    .select('id, role, status')
    .eq('id', authData.user.id)
    .single();
  if (actorError || actor?.status !== 'active' || !['admin', 'superadmin'].includes(actor.role)) {
    return jsonResponse(403, { error: 'Only an active admin or superadmin can manage accounts.' });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Request body must be valid JSON.' });
  }

  if (payload.action === 'create') {
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const password = typeof payload.password === 'string' ? payload.password : '';
    const firstName = typeof payload.firstName === 'string' ? payload.firstName.trim() : '';
    const lastName = typeof payload.lastName === 'string' ? payload.lastName.trim() : '';
    const role = typeof payload.role === 'string' ? payload.role : 'user';
    if (!email || !firstName || !lastName || password.length < 8) {
      return jsonResponse(400, { error: 'Provide a valid email, first and last name, and a password of at least 8 characters.' });
    }
    if (!['user', 'admin', 'superadmin'].includes(role)) return jsonResponse(400, { error: 'Invalid account role.' });
    if (actor.role !== 'superadmin' && role !== 'user') {
      return jsonResponse(403, { error: 'Admins can only create User accounts.' });
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (createError || !created.user) return jsonResponse(400, { error: createError?.message || 'Could not create the account.' });

    const { error: profileError } = await adminClient.from('app_profiles')
      .update({ role, status: 'active', permissions: [] })
      .eq('id', created.user.id);
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return jsonResponse(500, { error: `Account was created but its profile could not be configured: ${profileError.message}` });
    }
    return jsonResponse(201, { id: created.user.id, email });
  }

  if (payload.action === 'delete') {
    const userId = typeof payload.userId === 'string' ? payload.userId : '';
    if (!userId || userId === authData.user.id) return jsonResponse(400, { error: 'A different account must be selected.' });
    const { data: target, error: targetError } = await adminClient
      .from('app_profiles')
      .select('id, role')
      .eq('id', userId)
      .single();
    if (targetError || !target) return jsonResponse(404, { error: 'The account was not found.' });
    if (actor.role !== 'superadmin' && target.role !== 'user') {
      return jsonResponse(403, { error: 'Admins can only remove User accounts.' });
    }
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) return jsonResponse(500, { error: `Could not remove the account: ${deleteError.message}` });
    return jsonResponse(200, { deleted: userId });
  }

  return jsonResponse(400, { error: 'Unsupported account-management action.' });
});
