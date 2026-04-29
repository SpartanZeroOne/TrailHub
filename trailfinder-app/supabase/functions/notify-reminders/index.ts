// Edge Function: notify-reminders
// Scheduled daily at 09:00 UTC via pg_cron.
// Sends a 2-week reminder to every user registered for an event starting in 14 days.

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
    // Target date: today + 14 days
    const target = new Date()
    target.setDate(target.getDate() + 14)
    const targetDate = target.toISOString().split('T')[0]  // YYYY-MM-DD

    // 1. Find upcoming events starting exactly 14 days from today
    const { data: events, error: evErr } = await supabaseAdmin
      .from('events')
      .select('id, name, start_date, location')
      .eq('start_date', targetDate)
      .eq('status', 'upcoming')

    if (evErr) throw evErr
    if (!events?.length) return json({ ok: true, sent: 0, reason: 'no_events_in_14_days' })

    // 2. Gather all event registrations for those events
    const eventIds = events.map((e) => e.id)
    const { data: regs, error: regErr } = await supabaseAdmin
      .from('event_registrations')
      .select('user_id, event_id')
      .in('event_id', eventIds)
      .eq('status', 'registered')

    if (regErr) throw regErr
    if (!regs?.length) return json({ ok: true, sent: 0, reason: 'no_registrations' })

    // 3. Check which users have event_reminders enabled
    const userIds = [...new Set(regs.map((r) => r.user_id))]
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, notification_preferences')
      .in('id', userIds)

    const optedIn = new Set(
      (users ?? [])
        .filter((u) => u.notification_preferences?.event_reminders !== false)
        .map((u) => u.id),
    )

    // 4. Build a map: event_id → event metadata
    const eventMap = Object.fromEntries(events.map((e) => [String(e.id), e]))

    // 5. Send a notification per registration
    let sent = 0
    for (const reg of regs) {
      if (!optedIn.has(reg.user_id)) continue
      const event = eventMap[String(reg.event_id)]
      if (!event) continue

      const resp = await fetch(
        `${supabaseUrl}/functions/v1/send-push-notification`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: reg.user_id,
            title:   '📅 Erinnerung: Event in 2 Wochen!',
            body:    `${event.name} startet am ${event.start_date} in ${event.location}`,
            url:     '/',
            type:    'reminder',
          }),
        },
      )
      if (resp.ok) sent++
    }

    return json({ ok: true, sent })
  } catch (err: any) {
    console.error('notify-reminders error:', err)
    return json({ error: err.message ?? String(err) }, 500)
  }
})

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
