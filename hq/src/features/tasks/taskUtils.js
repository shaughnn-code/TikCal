// Small pure helpers shared by the tasks feature.
export { fmtDue } from '../../lib/dates.js'

// "a, b , ,c" -> ['a','b','c'] (trimmed, deduped, no empties)
export function parseTags(s) {
  return [...new Set(s.split(',').map((t) => t.trim()).filter(Boolean))]
}

export const NEXT_STATUS = { todo: 'doing', doing: 'done', done: 'todo' }
