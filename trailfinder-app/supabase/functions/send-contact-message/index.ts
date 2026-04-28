// Edge Function: send-contact-message
// Sends contact form submissions to info@trailhub.mx via Resend API.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { sender_name, sender_email, subject, message, source, organizer_id } = await req.json()

    if (!sender_name || !sender_email || !message) {
      return json({ error: 'Missing required fields' }, 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sender_email)) {
      return json({ error: 'Invalid email address' }, 400)
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    // Resolve organizer name for admin submissions
    let organizerName = ''
    if (source === 'admin' && organizer_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const sb = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: org } = await sb.from('organizers').select('name').eq('id', organizer_id).single()
      if (org?.name) organizerName = org.name
    }

    const subjectPrefix = source === 'admin' ? '[Organizer Contact]' : '[Website Contact]'
    const emailSubject = `${subjectPrefix} ${subject || '—'}`
    const sourceLabel = source === 'admin'
      ? `Admin Panel (${organizerName || 'Organizer'})`
      : 'Website Footer'

    const safeMessage = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'TrailHub Contact <noreply@trailhub.mx>',
        to: ['info@trailhub.mx'],
        reply_to: sender_email,
        subject: emailSubject,
        html: `
          <div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;color:#222;">
            <h2 style="color:#FF6B00;margin-bottom:4px;">New Contact Form Submission</h2>
            <p style="color:#888;font-size:13px;margin-top:0;">via TrailHub ${sourceLabel}</p>
            <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:20px 0;">
              <p style="margin:4px 0;"><strong>Source:</strong> ${sourceLabel}</p>
              <p style="margin:4px 0;"><strong>Name:</strong> ${sender_name}</p>
              <p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${sender_email}">${sender_email}</a></p>
              <p style="margin:4px 0;"><strong>Subject:</strong> ${subject || '—'}</p>
            </div>
            <h3 style="margin-bottom:8px;">Message:</h3>
            <div style="background:#fafafa;padding:16px;border-radius:8px;border-left:4px solid #FF6B00;">
              <p style="white-space:pre-wrap;margin:0;">${safeMessage}</p>
            </div>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #ddd;color:#888;font-size:12px;">
              <p>Reply directly to: <a href="mailto:${sender_email}">${sender_email}</a></p>
            </div>
          </div>
        `,
      }),
    })

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text()
      throw new Error(`Resend error ${resendResponse.status}: ${errBody}`)
    }

    return json({ success: true })
  } catch (err: any) {
    console.error('send-contact-message error:', err)
    return json({ error: err.message ?? String(err) }, 500)
  }
})

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
