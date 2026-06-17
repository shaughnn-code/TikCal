// TikCal inbound email → auto-import. A forwarded ticket confirmation hits this
// webhook (from an inbound-email provider: SendGrid Parse / Postmark / generic),
// gets routed to a user by their import token, parsed by Claude, and filed as an
// event. Public webhook: verify_jwt = false, gated by INBOUND_SECRET.
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
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim()
}

const SCHEMA = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' }, artist: { type: 'string' }, event_date: { type: 'string' },
      venue: { type: 'string' }, notes: { type: 'string' },
    },
    required: ['title', 'artist', 'event_date', 'venue', 'notes'],
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

  // ── Parse provider payload (JSON or form-data) into {recipients, subject, text}
  let recipients = ''
  let subject = ''
  let text = ''
  try {
    const ct = req.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const b: Record<string, unknown> = await req.json()
      recipients = [b.To, b.OriginalRecipient, b.Recipient, b.to, JSON.stringify(b.ToFull || ''), JSON.stringify(b.envelope || '')].filter(Boolean).join(' ')
      subject = String(b.Subject || b.subject || '')
      text = String(b.TextBody || b.text || (b.HtmlBody ? stripHtml(String(b.HtmlBody)) : '') || (b.html ? stripHtml(String(b.html)) : ''))
    } else {
      const f = await req.formData()
      recipients = [f.get('to'), f.get('envelope'), f.get('recipient')].filter(Boolean).join(' ')
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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return ok('no-api-key')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const source = `${subject}\n\n${text}`.slice(0, 12000)
  if (source.trim().length < 8) return ok('empty')

  let fields: { title: string; artist: string; event_date: string; venue: string; notes: string }
  try {
    const msg = await new Anthropic({ apiKey }).messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        `Extract concert/club-show details from this forwarded ticket confirmation email into structured JSON for a NYC events calendar. ` +
        `Today is ${today} (America/New_York). event_date MUST be YYYY-MM-DD. "title" is the event/night name, "artist" the performer(s), "venue" the location. ` +
        `If the email is not a real ticket/event confirmation, return empty strings for every field.`,
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

  if (!fields.title || !fields.event_date) return ok('not-an-event')

  // dedupe: same owner + date + title
  const { data: dup } = await admin
    .from('events')
    .select('id')
    .eq('owner_id', inbox.user_id)
    .eq('event_date', fields.event_date)
    .ilike('title', fields.title)
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
