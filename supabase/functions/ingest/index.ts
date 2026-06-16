// TikCal "Smart Add" ingestion — turns a ticket link / pasted text / screenshot
// into structured event fields using Claude. JWT-protected (verify_jwt = true).
//
// Reads ANTHROPIC_API_KEY from Edge Function secrets.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.69.0'

const MODEL = 'claude-opus-4-8'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

// Strip a fetched HTML page down to readable text for the model.
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|br|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, 12000)
}

async function fetchPageText(url: string): Promise<string> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('That doesn’t look like a valid URL.')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) links are supported.')
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TikCalBot/1.0)' },
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`Couldn’t load that page (HTTP ${res.status}).`)
    const html = await res.text()
    const text = htmlToText(html)
    if (text.length < 40) {
      throw new Error('That page had no readable text — try pasting the details instead.')
    }
    return text
  } finally {
    clearTimeout(timer)
  }
}

const OUTPUT_SCHEMA = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Event / night name. Empty string if unknown.' },
      artist: { type: 'string', description: 'Performer(s) / DJ(s), comma-separated. Empty string if unknown.' },
      event_date: { type: 'string', description: 'Date as YYYY-MM-DD. Empty string if unknown.' },
      venue: { type: 'string', description: 'Venue / location name. Empty string if unknown.' },
      notes: { type: 'string', description: 'Door time, set time, ticket notes, etc. Empty string if none.' },
    },
    required: ['title', 'artist', 'event_date', 'venue', 'notes'],
    additionalProperties: false,
  },
} as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Server is missing ANTHROPIC_API_KEY.' }, 500)

  let payload: {
    type?: 'link' | 'text' | 'image'
    url?: string
    text?: string
    image_base64?: string
    media_type?: string
  }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }

  // Today's date in America/New_York so relative dates ("this Friday") resolve correctly.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const system =
    `You extract concert / club-show details from the provided source into structured JSON for a NYC events calendar. ` +
    `Today is ${today} (America/New_York); resolve relative dates like "this Friday" or "tomorrow" accordingly. ` +
    `event_date MUST be YYYY-MM-DD. "title" is the event or night name; "artist" is the performer(s)/DJ(s); ` +
    `"venue" is the location. If a field is not present in the source, return an empty string for it — never guess.`

  // Build the user content from the chosen input type.
  let userContent: Anthropic.MessageParam['content']
  try {
    if (payload.type === 'link') {
      const text = await fetchPageText(payload.url ?? '')
      userContent = `Extract the event details from this page:\n\n${text}`
    } else if (payload.type === 'text') {
      const t = (payload.text ?? '').trim()
      if (t.length < 4) return json({ error: 'Paste a bit more detail.' }, 400)
      userContent = `Extract the event details from this text:\n\n${t.slice(0, 12000)}`
    } else if (payload.type === 'image') {
      if (!payload.image_base64) return json({ error: 'No image provided.' }, 400)
      userContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: (payload.media_type ?? 'image/jpeg') as
              | 'image/jpeg'
              | 'image/png'
              | 'image/gif'
              | 'image/webp',
            data: payload.image_base64,
          },
        },
        { type: 'text', text: 'Extract the event details from this screenshot/flyer.' },
      ]
    } else {
      return json({ error: 'Unknown input type.' }, 400)
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 422)
  }

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userContent }],
      output_config: { format: OUTPUT_SCHEMA },
    } as Anthropic.MessageCreateParamsNonStreaming)

    if (message.stop_reason === 'refusal') {
      return json({ error: 'Couldn’t process that source.' }, 422)
    }

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return json({ error: 'No structured result returned.' }, 502)
    }
    const fields = JSON.parse(textBlock.text)
    return json({ fields })
  } catch (e) {
    console.error('ingest error', e)
    return json({ error: 'Extraction failed. Try again or enter the details manually.' }, 502)
  }
})
