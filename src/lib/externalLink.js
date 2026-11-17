// Event links come from third-party scrapers (RA, DICE, Ticketmaster), so they
// are untrusted. Only plain https links are rendered: no javascript:/data: URLs,
// and no embedded credentials (which also catches `https://ra.co@evil.com/x`,
// where the real host is evil.com). Returns the normalised URL, or '' to omit.
export function safeExternalUrl(raw) {
  if (typeof raw !== 'string' || !raw) return ''
  let u
  try {
    u = new URL(raw.trim())
  } catch {
    return ''
  }
  if (u.protocol !== 'https:') return ''
  if (u.username || u.password) return ''
  return u.href
}
