// Browser-storage stand-in for server.mjs, mirroring its API exactly.
// Data lives in localStorage when the host allows it, else in memory for the
// session. Also shadows window.localStorage with an in-memory shim when the
// sandbox blocks it, so the timer engine keeps working.

// --- localStorage may throw in sandboxed iframes; fall back to memory ---
function storageWorks() {
  try {
    window.localStorage.setItem('hq.probe', '1')
    window.localStorage.removeItem('hq.probe')
    return true
  } catch {
    return false
  }
}
if (!storageWorks()) {
  const mem = new Map()
  const shim = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear(),
  }
  try {
    Object.defineProperty(window, 'localStorage', { value: shim, configurable: true })
  } catch {
    // last resort: the timer engine's own try/catch keeps the app alive
  }
}

// --- tiny persistent DB ---
const DB_KEY = 'hq.demo.db'
function loadDb() {
  try {
    const raw = window.localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { tasks: [], events: [], sessions: [], notes: [] } // notes: {id, body, updatedAt}
}
const db = loadDb()
function saveDb() {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {}
}

function uuid() {
  try {
    return crypto.randomUUID()
  } catch {
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

// --- note metadata, same derivation as server.mjs ---
function noteTitle(body) {
  for (const line of body.split('\n')) {
    const t = line.replace(/^#{1,6}\s*/, '').trim()
    if (t) return t.slice(0, 120)
  }
  return 'Untitled'
}
function noteMeta(n) {
  const stripped = n.body.replace(/^#{1,6}\s.*$/m, '')
  const excerpt = stripped.replace(/[#*`>\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140)
  return { id: n.id, title: noteTitle(n.body), excerpt, updatedAt: n.updatedAt }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const notFound = () => json({ error: 'not found' }, 404)

const COLLECTIONS = ['tasks', 'events', 'sessions']

function handle(method, pathname, body) {
  const [, col, id] = pathname.split('/').filter(Boolean) // ['api', col, id?]
  if (col === 'health') return json({ ok: true })

  if (COLLECTIONS.includes(col)) {
    const items = db[col]
    if (method === 'GET' && !id) return json(items)
    if (method === 'POST' && !id) {
      const item = { ...body, id: uuid(), createdAt: new Date().toISOString() }
      items.push(item)
      saveDb()
      return json(item, 201)
    }
    if (method === 'PATCH' && id) {
      const i = items.findIndex((x) => x.id === id)
      if (i === -1) return notFound()
      const { id: _i, createdAt: _c, ...patch } = body || {}
      items[i] = { ...items[i], ...patch }
      saveDb()
      return json(items[i])
    }
    if (method === 'DELETE' && id) {
      const i = items.findIndex((x) => x.id === id)
      if (i === -1) return notFound()
      items.splice(i, 1)
      saveDb()
      return json({ ok: true })
    }
  }

  if (col === 'notes') {
    const notes = db.notes
    if (method === 'GET' && !id)
      return json(notes.map(noteMeta).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)))
    const found = notes.find((n) => n.id === id)
    if (method === 'GET' && id) return found ? json({ ...noteMeta(found), body: found.body }) : notFound()
    if (method === 'POST' && !id) {
      const n = { id: uuid().slice(0, 8), body: body?.body ?? '', updatedAt: new Date().toISOString() }
      notes.push(n)
      saveDb()
      return json({ ...noteMeta(n), body: n.body }, 201)
    }
    if (method === 'PUT' && id) {
      if (!found) return notFound()
      found.body = body?.body ?? ''
      found.updatedAt = new Date().toISOString()
      saveDb()
      return json({ ...noteMeta(found), body: found.body })
    }
    if (method === 'DELETE' && id) {
      if (!found) return notFound()
      notes.splice(notes.indexOf(found), 1)
      saveDb()
      return json({ ok: true })
    }
  }

  return json({ error: 'unknown endpoint' }, 404)
}

const realFetch = window.fetch.bind(window)
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  if (!url.startsWith('/api/')) return realFetch(input, init)
  const method = (init.method || 'GET').toUpperCase()
  const body = init.body ? JSON.parse(init.body) : undefined
  return handle(method, url, body)
}
