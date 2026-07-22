// Small pure helpers shared by the tasks feature.
import { parseYmd } from '../../lib/dates.js'

// "a, b , ,c" -> ['a','b','c'] (trimmed, deduped, no empties)
export function parseTags(s) {
  return [...new Set(s.split(',').map((t) => t.trim()).filter(Boolean))]
}

// 'YYYY-MM-DD' -> "Jul 22" (adds year when it differs from the current one)
export function fmtDue(due) {
  const d = parseYmd(due)
  const opts = { month: 'short', day: 'numeric' }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString(undefined, opts)
}

export const NEXT_STATUS = { todo: 'doing', doing: 'done', done: 'todo' }
