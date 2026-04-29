// Edge Function: send-push-notification
// Sends a Web Push notification to every registered device of a given user.
// Uses npm:web-push (VAPID) for web subscriptions.
// Called internally by other notification edge functions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys not configured')
    return json({ error: 'VAPID keys not configured' }, 500)
  }

  webpush.setVapidDetails(
    'mailto:info@trailhub.mx',
    vapidPublicKey,
    vapidPrivateKey,
  )

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    const { user_id, title, body, url, type } = await req.json()
    if (!user_id || !title) return json({ error: 'Missing user_id or title' }, 400)

    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key, platform')
      .eq('user_id', user_id)

    if (error) throw error
    if (!subs?.length) return json({ ok: true, sent: 0 })

    const payload = JSON.stringify({
      title,
      body:  body ?? '',
      data:  { url: url ?? '/', type: type ?? 'general' },
    })

    let sent = 0
    for (const sub of subs) {
      if (sub.platform === 'web' && sub.endpoint && sub.p256dh && sub.auth_key) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            payload,
          )
          sent++
        } catch (err: any) {
          // 410 Gone = subscription expired; clean it up
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            console.error('webpush error for sub', sub.id, err.statusCode, err.body)
          }
        }
      }
      // Android / iOS native push via FCM would go here once Firebase is configured
    }

    return json({ ok: true, sent })
  } catch (err: any) {
    console.error('send-push-notification error:', err)
    return json({ error: err.message ?? String(err) }, 500)
  }
})

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
