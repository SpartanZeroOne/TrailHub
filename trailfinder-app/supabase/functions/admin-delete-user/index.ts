// Edge Function: admin-delete-user
// Deletes a user from auth.users using the service role key (server-side only).
// Cascades automatically to public.users via ON DELETE CASCADE.
// Verifies the caller is a super_admin before proceeding.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url     = Deno.env.get('SUPABASE_URL')!
    const anon    = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const auth    = req.headers.get('Authorization') ?? ''

    // ── 1. Verify caller is super_admin ─────────────────────────────────────
    const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const { data: profile } = await caller.from('users').select('admin_role').eq('id', user.id).single()
    if (profile?.admin_role !== 'super_admin') {
      return json({ error: 'Forbidden: super_admin only' }, 403)
    }

    // ── 2. Delete target user from auth.users (cascades to public.users) ────
    const { userId } = await req.json()
    if (!userId) return json({ error: 'userId is required' }, 400)

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) throw error

    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message ?? String(err) }, 500)
  }
})

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
