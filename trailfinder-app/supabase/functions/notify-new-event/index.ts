// Edge Function: notify-new-event
// Called by a pg_net DB trigger whenever a new event is inserted.
// Finds all users within 200 km who enabled "new_events_region" notifications
// and dispatches a push via send-push-notification.

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
    const { event_id, event_name, event_location, coordinates } = await req.json()

    if (!event_id || !event_name) return json({ error: 'Missing event_id or event_name' }, 400)

    // Require coordinates for PostGIS radius search
    const lat = coordinates?.lat ?? null
    const lng = coordinates?.lng ?? null
    if (!lat || !lng) return json({ ok: true, sent: 0, reason: 'no_coordinates' })

    // Call PostGIS RPC to find users within 200 km who have opted in + stored location
    const { data: nearbyUsers, error: rpcErr } = await supabaseAdmin.rpc('users_near_event', {
      event_lat:      lat,
      event_lng:      lng,
      radius_meters:  200000,
    })

    if (rpcErr) throw rpcErr
    if (!nearbyUsers?.length) return json({ ok: true, sent: 0, reason: 'no_nearby_users' })

    // Send a notification to each nearby user
    let sent = 0
    for (const row of nearbyUsers) {
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/send-push-notification`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: row.user_id,
            title:   '🏁 Neues Event in deiner Region!',
            body:    `${event_name}${event_location ? ` — ${event_location}` : ''}`,
            url:     '/',
            type:    'new_event',
          }),
        },
      )
      if (resp.ok) sent++
    }

    return json({ ok: true, sent })
  } catch (err: any) {
    console.error('notify-new-event error:', err)
    return json({ error: err.message ?? String(err) }, 500)
  }
})

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
