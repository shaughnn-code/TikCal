// Guards user-entered link fields (e.g. event.source_url) against javascript:/data:
// URI injection. Only http(s) links are considered safe to store or render as href.
export function isSafeUrl(value) {
  if (!value) return false
  return /^https?:\/\//i.test(value.trim())
}

// Returns the trimmed URL if safe, otherwise null.
export function toSafeUrl(value) {
  if (!value) return null
  const trimmed = value.trim()
  return isSafeUrl(trimmed) ? trimmed : null
}
