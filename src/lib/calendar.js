// Client-side calendar export: turn a TikCal event into "Add to Google /
// Outlook" links and a downloadable .ics file. No backend needed — this is the
// per-event, one-shot flavor. (The live subscription feed lives in the `ics`
// edge function.)

// Events only carry a date (no time), so everything exports as an all-day event.
const ymd = (dateStr) => (dateStr || '').replaceAll('-', '') // 2026-07-10 → 20260710

// The day after event_date, as YYYYMMDD — all-day DTEND / Google end are exclusive.
const nextYmd = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

const summaryFor = (e) => (e.artist ? `${e.title} — ${e.artist}` : e.title)

const descFor = (e) => {
  const parts = []
  if (e.artist) parts.push(`Artist: ${e.artist}`)
  if (e.notes) parts.push(e.notes)
  parts.push(`On TikCal: https://tikcal.nyc/events/${e.id}`)
  return parts.join('\n')
}

// ── Google Calendar "template" link ──────────────────────────────────────────
export function googleCalendarUrl(e) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: summaryFor(e),
    dates: `${ymd(e.event_date)}/${nextYmd(e.event_date)}`,
    details: descFor(e),
    location: e.venue || '',
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

// ── Outlook web "compose" deeplink ───────────────────────────────────────────
export function outlookCalendarUrl(e) {
  const p = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: summaryFor(e),
    startdt: e.event_date,
    enddt: e.event_date,
    allday: 'true',
    body: descFor(e),
    location: e.venue || '',
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`
}

// ── .ics (iCalendar) generation ──────────────────────────────────────────────
// Escape per RFC 5545: backslash, comma, semicolon, and newlines.
const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

export function eventToVEvent(e) {
  return [
    'BEGIN:VEVENT',
    `UID:${e.id}@tikcal.nyc`,
    `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${ymd(e.event_date)}`,
    `DTEND;VALUE=DATE:${nextYmd(e.event_date)}`,
    `SUMMARY:${esc(summaryFor(e))}`,
    e.venue ? `LOCATION:${esc(e.venue)}` : null,
    `DESCRIPTION:${esc(descFor(e))}`,
    `URL:https://tikcal.nyc/events/${e.id}`,
    'END:VEVENT',
  ]
    .filter(Boolean)
    .join('\r\n')
}

export function buildICS(events, calName = 'TikCal') {
  const body = (Array.isArray(events) ? events : [events]).map(eventToVEvent).join('\r\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TikCal//Concert Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`,
    body,
    'END:VCALENDAR',
  ].join('\r\n')
}

// Trigger a browser download of a single event as an .ics file. Apple Calendar,
// Fantastical, etc. open these directly.
export function downloadICS(e) {
  const blob = new Blob([buildICS(e)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(e.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
