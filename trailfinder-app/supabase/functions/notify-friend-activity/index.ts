// Edge Function: notify-friend-activity
// Called by a pg_net DB trigger whenever a new event_registration is inserted.
// Notifies friends of the registrant who have "friend_registrations" enabled.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const { registrant_id, event_id } = await req.json()
    if (!registrant_id || !event_id) {
      return json({ error: 'Missing registrant_id or event_id' }, 400)
    }

    // 1. Fetch the registrant's name and the event name in parallel
    const [{ data: registrant }, { data: event }] = await Promise.all([
      supabaseAdmin.from('users').select('name').eq('id', registrant_id).single(),
      supabaseAdmin.from('events').select('id, name').eq('id', event_id).maybeSingle(),
    ])

    const registrantName = registrant?.name || 'Ein Freund'
    const eventName      = event?.name      || 'einem Event'

    // 2. Find accepted friends of the registrant (bidirectional rows)
    const { data: friendRows, error: frErr } = await supabaseAdmin
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${registrant_id},friend_id.eq.${registrant_id}`)
      .eq('status', 'accepted')

    if (frErr) throw frErr
    if (!friendRows?.length) return json({ ok: true, sent: 0, reason: 'no_friends' })

    // Resolve the "other side" of each friendship row
    const friendIds = friendRows.map((r) =>
      r.user_id === registrant_id ? r.friend_id : r.user_id,
    )

    // 3. Check which friends have friend_registrations notifications enabled
    const { data: friendUsers } = await supabaseAdmin
      .from('users')
      .select('id, notification_preferences')
      .in('id', friendIds)

    const eligible = (friendUsers ?? []).filter(
      (u) => u.notification_preferences?.friend_registrations !== false,
    )

    if (!eligible.length) return json({ ok: true, sent: 0, reason: 'no_eligible_friends' })

    // 4. Send notification to each eligible friend
    let sent = 0
    for (const friend of eligible) {
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/send-push-notification`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: friend.id,
            title:   '👥 Freundes-Aktivität',
            body:    `${registrantName} hat sich für ${eventName} angemeldet!`,
            url:     '/',
            type:    'friend_activity',
          }),
        },
      )
      if (resp.ok) sent++
    }

    return json({ ok: true, sent })
  } catch (err: any) {
    console.error('notify-friend-activity error:', err)
    return json({ error: err.message ?? String(err) }, 500)
  }
})

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
