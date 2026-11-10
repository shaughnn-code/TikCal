// Emails dev@tikcal.nyc about a new user report so it can be acted on within
// 24 hours (App Store guideline 1.2). JWT-protected (verify_jwt = true).
//
// The client calls report_content() (which files the report and returns its
// id), then calls this with { report_id }. Only the person who filed the
// report can trigger its alert, and each report alerts at most once
// (alerted_at). If this call never happens (app closed, network), the report
// is still in public.user_reports with status 'open' -- check the Table
// Editor daily as the backstop.
//
// Secrets: RESEND_API_KEY + EMAIL_FROM (see _shared/email.ts), optional REPORT_ALERT_TO.
// Deploy: supabase functions deploy report-alert
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/email.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  const body = await req.json().catch(() => ({}))
  const reportId = typeof body?.report_id === 'string' ? body.report_id : ''
  if (!UUID.test(reportId)) return json({ error: 'Bad report id.' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Claim the alert atomically: only the reporter, only once.
  const { data: report, error: claimErr } = await admin
    .from('user_reports')
    .update({ alerted_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('reporter_id', user.id)
    .is('alerted_at', null)
    .select('id, reason, details, created_at, reporter_id, reported_user_id, event_id')
    .maybeSingle()
  if (claimErr) {
    console.error(`report-alert: claim failed ${claimErr.message}`)
    return json({ error: 'Could not read the report.' }, 500)
  }
  if (!report) return json({ ok: true, skipped: true })

  const ids = [report.reporter_id, report.reported_user_id].filter(Boolean)
  const { data: profs } = await admin.from('profiles').select('id, name').in('id', ids)
  const nameOf = (id: string | null) => (id ? profs?.find((p) => p.id === id)?.name || '(no name)' : '-')
  let eventLine = '-'
  if (report.event_id) {
    const { data: ev } = await admin.from('events').select('title, artist, event_date').eq('id', report.event_id).maybeSingle()
    eventLine = ev ? `${ev.artist || ev.title} on ${ev.event_date} (${report.event_id})` : `${report.event_id} (deleted)`
  }

  const text = [
    `New TikCal report: ${report.reason}`,
    '',
    `Reported user: ${nameOf(report.reported_user_id)} (${report.reported_user_id || '-'})`,
    `Show: ${eventLine}`,
    `Reported by: ${nameOf(report.reporter_id)} (${report.reporter_id})`,
    `Filed: ${report.created_at}`,
    '',
    'Details:',
    report.details || '(none)',
    '',
    `Report id: ${report.id}`,
    'Act within 24 hours: review in Supabase Table Editor -> user_reports, remove the content or',
    "account if it breaks the Terms, then set status to 'actioned' or 'dismissed'.",
  ].join('\n')

  const to = Deno.env.get('REPORT_ALERT_TO') || 'dev@tikcal.nyc'
  const sent = await sendEmail({
    to,
    fromName: 'TikCal reports',
    subject: `[TikCal report] ${report.reason}: ${nameOf(report.reported_user_id)}`,
    text,
  })
  if (!sent.ok) {
    console.error(`report-alert: resend ${sent.status} ${sent.detail}`)
    // Release the claim so a retry can send it.
    await admin.from('user_reports').update({ alerted_at: null }).eq('id', report.id)
    return json({ ok: true, emailed: false })
  }
  return json({ ok: true, emailed: true })
})
