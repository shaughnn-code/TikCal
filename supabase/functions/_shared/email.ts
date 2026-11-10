// Sends a plain-text email through Resend (https://resend.com/docs/api-reference/emails/send-email).
//
// Secrets: RESEND_API_KEY (required), EMAIL_FROM (optional).
// EMAIL_FROM defaults to Resend's shared test sender, which can only deliver to
// the Resend account owner's own address. Set it to "TikCal <noreply@tikcal.nyc>"
// once tikcal.nyc is verified in Resend.
export type SendResult = { ok: boolean; status: number; detail: string }

export async function sendEmail(opts: { to: string; subject: string; text: string; fromName?: string }): Promise<SendResult> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return { ok: false, status: 0, detail: 'RESEND_API_KEY missing' }
  const configured = Deno.env.get('EMAIL_FROM') || 'onboarding@resend.dev'
  // A display name passed here replaces the one in EMAIL_FROM.
  const address = configured.match(/<([^>]+)>/)?.[1] || configured
  const from = opts.fromName ? `${opts.fromName} <${address}>` : configured

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, text: opts.text }),
  })
  const detail = resp.ok ? '' : await resp.text()
  return { ok: resp.ok, status: resp.status, detail }
}
