// TikCal inbound email → auto-import. A forwarded ticket confirmation hits this
// webhook (from an inbound-email provider: SendGrid Parse / Postmark / generic),
// gets routed to a user by their import token, parsed by Claude, and filed as an
// event. Public webhook: verify_jwt = false, gated by INBOUND_SECRET.
//
// Special case: Gmail's "Forwarding Confirmation" email is detected and the
// confirmation code + verify link are relayed to the user's real inbox (via the
// SendGrid mail API) so they can finish setting up auto-forwarding.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.69.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const MODEL = 'claude-opus-4-8'
const INBOX_DOMAIN = 'in.tikcal.nyc'

const ok = (msg = 'ok') => new Response(JSON.stringify({ status: msg }), { status: 200, headers: { 'Content-Type': 'application/json' } })

function localpartFor(text: string): string | null {
  if (!text) return null
  const re = new RegExp(`([a-z0-9._+\\-]+)@${INBOX_DOMAIN.replace('.', '\\.')}`, 'i')
  const m = text.match(re)
  return m ? m[1].toLowerCase() : null
}
const tokenFromLocal = (lp: string) => {
  const i = lp.lastIndexOf('-')
  return i >= 0 ? lp.slice(i + 1) : lp
}
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim()
}
async function sendViaSendGrid(key: string, to: string, subject: string, body: string): Promise<Response> {
  return await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'noreply@tikcal.nyc', name: 'TikCal' },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  })
}

const SCHEMA = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      kind: {
        type: 'string',
        enum: ['confirmation', 'promotion', 'other'],
        description: 'confirmation = recipient actually bought a ticket / registered / RSVPed and is going; promotion = ad, on-sale, recommendation, lineup announcement; other = anything else.',
      },
      title: { type: 'string' }, artist: { type: 'string' }, event_date: { type: 'string' },
      venue: { type: 'string' }, notes: { type: 'string' },
    },
    required: ['kind', 'title', 'artist', 'event_date', 'venue', 'notes'],
    additionalProperties: false,
  },
} as const

Deno.serve(async (req) => {
  if (req.method !== 'POST') return ok('ignored')

  const url = new URL(req.url)
  const secret = url.searchParams.get('secret') || req.headers.get('x-inbound-secret')
  if (!Deno.env.get('INBOUND_SECRET') || secret !== Deno.env.get('INBOUND_SECRET')) {
    return new Response('forbidden', { status: 401 })
  }

  let recipients = '', from = '', subject = '', text = ''
  try {
    const ct = req.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const b: Record<string, unknown> = await req.json()
      recipients = [b.To, b.OriginalRecipient, b.Recipient, b.to, JSON.stringify(b.ToFull || ''), JSON.stringify(b.envelope || '')].filter(Boolean).join(' ')
      from = String(b.From || b.from || JSON.stringify(b.FromFull || ''))
      subject = String(b.Subject || b.subject || '')
      text = String(b.TextBody || b.text || (b.HtmlBody ? stripHtml(String(b.HtmlBody)) : '') || (b.html ? stripHtml(String(b.html)) : ''))
    } else {
      const f = await req.formData()
      recipients = [f.get('to'), f.get('envelope'), f.get('recipient')].filter(Boolean).join(' ')
      from = String(f.get('from') || '')
      subject = String(f.get('subject') || '')
      const t = f.get('text') || f.get('email') || ''
      const h = f.get('html') || ''
      text = String(t) || (h ? stripHtml(String(h)) : '')
    }
  } catch (_) {
    return ok('unparseable')
  }

  const lp = localpartFor(recipients)
  if (!lp) return ok('no-recipient')
  const token = tokenFromLocal(lp)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: inbox } = await admin.from('user_inbox').select('user_id').eq('token', token).maybeSingle()
  if (!inbox) return ok('unknown-token')

  // ── Gmail forwarding-confirmation relay ────────────────────────────────
  const isGmailConfirm =
    /forwarding-noreply@google\.com/i.test(from) || /forwarding confirmation/i.test(subject)
  if (isGmailConfirm) {
    const sgKey = Deno.env.get('SENDGRID_API_KEY')
    const { data: u } = await admin.auth.admin.getUserById(inbox.user_id)
    const userEmail = u?.user?.email
    const code =
      subject.match(/\(#\s*(\d{4,})\)/)?.[1] ||
      text.match(/confirmation code[^0-9]*(\d{5,})/i)?.[1] ||
      text.match(/\b(\d{6,12})\b/)?.[1] || ''
    const link = text.match(/https?:\/\/[^\s"'<>]*google\.com[^\s"'<>]*/i)?.[0] || ''
    if (sgKey && userEmail) {
      const resp = await sendViaSendGrid(
        sgKey, userEmail,
        'Confirm your TikCal email auto-import',
        `Gmail wants you to confirm forwarding to your TikCal import address.\n\n` +
        `Confirmation code: ${code || '(see the link below)'}\n\n` +
        `Confirm here: ${link || '(or open Gmail → Settings → Forwarding and enter the code)'}\n\n` +
        `Once confirmed, your forwarded ticket emails will auto-import into TikCal.`,
      )
      const detail = resp.status >= 400 ? await resp.text() : ''
      console.log(`gmail-relay → ${userEmail} · sendgrid ${resp.status} ${detail}`)
      return ok('relayed-gmail-confirmation')
    }
    console.log(`gmail-confirmation: missing ${sgKey ? 'user email' : 'SENDGRID_API_KEY'}`)
    return ok('gmail-confirmation-no-key')
  }

  // ── normal event extraction ─────────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return ok('no-api-key')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const source = `${subject}\n\n${text}`.slice(0, 12000)
  if (source.trim().length < 8) return ok('empty')

  let fields: { kind: string; title: string; artist: string; event_date: string; venue: string; notes: string }
  try {
    const msg = await new Anthropic({ apiKey }).messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        `You triage a forwarded email for a NYC events calendar and extract show details as JSON.\n` +
        `Set "kind" = "confirmation" ONLY if the recipient has actually purchased a ticket, registered, RSVPed, or is otherwise confirmed to attend — signals: an order/booking confirmation, order number, receipt, "your ticket(s)", "you're going", QR/barcode, booking reference, "order confirmed".\n` +
        `Set "kind" = "promotion" for marketing where the recipient has NOT bought anything — on-sale alerts, recommendations, "get tickets", "don't miss", "tickets available", lineup/announcement, price teasers, newsletters.\n` +
        `Set "kind" = "other" for anything else (forwarding/verification emails, password resets, non-event receipts).\n` +
        `Also extract title (event/night name), artist (performer(s)), venue, and event_date as YYYY-MM-DD when present (even for promotions). Today is ${today} (America/New_York). Use empty strings for unknown fields.`,
      messages: [{ role: 'user', content: source }],
      output_config: { format: SCHEMA },
    } as Anthropic.MessageCreateParamsNonStreaming)
    if (msg.stop_reason === 'refusal') return ok('refused')
    const tb = msg.content.find((b) => b.type === 'text')
    if (!tb || tb.type !== 'text') return ok('no-output')
    fields = JSON.parse(tb.text)
  } catch (e) {
    console.error('inbound parse error', e)
    return ok('parse-failed')
  }

  // Only genuine purchase/RSVP confirmations become events — never ads/promos.
  if (fields.kind !== 'confirmation') return ok(`skipped-${fields.kind || 'nonconfirmation'}`)
  if (!fields.title || !fields.event_date) return ok('not-an-event')

  const { data: dup } = await admin
    .from('events').select('id')
    .eq('owner_id', inbox.user_id).eq('event_date', fields.event_date).ilike('title', fields.title)
    .maybeSingle()
  if (dup) return ok('duplicate')

  const { error } = await admin.from('events').insert({
    owner_id: inbox.user_id,
    title: fields.title,
    artist: fields.artist || '',
    event_date: fields.event_date,
    venue: fields.venue || '',
    notes: fields.notes ? `${fields.notes}\n\n(auto-imported from email)` : '(auto-imported from email)',
    share_friends: false,
  })
  if (error) { console.error('inbound insert error', error); return ok('insert-failed') }
  return ok('imported')
})
