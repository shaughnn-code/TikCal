// HQ local server: serves the built app from ./dist and a JSON API over ./data.
// Zero dependencies. Run with: node server.mjs  (or npm start)
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DATA = process.env.HQ_DATA ? path.resolve(process.env.HQ_DATA) : path.join(ROOT, 'data')
const NOTES = path.join(DATA, 'notes')
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.HQ_PORT || 5317)

const COLLECTIONS = ['tasks', 'events', 'sessions']

fs.mkdirSync(NOTES, { recursive: true })
for (const col of COLLECTIONS) {
  const f = path.join(DATA, `${col}.json`)
  if (!fs.existsSync(f)) atomicWrite(f, '[]\n')
}

// Write to a temp file then rename, so a crash mid-write can never corrupt data.
function atomicWrite(file, text) {
  const tmp = `${file}.tmp-${process.pid}`
  fs.writeFileSync(tmp, text)
  fs.renameSync(tmp, file)
}

function readCollection(col) {
  const raw = fs.readFileSync(path.join(DATA, `${col}.json`), 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error(`${col}.json is not an array`)
  return parsed
}

function writeCollection(col, items) {
  atomicWrite(path.join(DATA, `${col}.json`), JSON.stringify(items, null, 2) + '\n')
}

function noteFile(id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw httpError(400, 'bad note id')
  return path.join(NOTES, `${id}.md`)
}

function noteTitle(body) {
  for (const line of body.split('\n')) {
    const t = line.replace(/^#{1,6}\s*/, '').trim()
    if (t) return t.slice(0, 120)
  }
  return 'Untitled'
}

function noteMeta(id, body, mtime) {
  const stripped = body.replace(/^#{1,6}\s.*$/m, '')
  const excerpt = stripped.replace(/[#*`>\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140)
  return { id, title: noteTitle(body), excerpt, updatedAt: mtime.toISOString() }
}

function listNotes() {
  return fs
    .readdirSync(NOTES)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const id = f.slice(0, -3)
      const body = fs.readFileSync(path.join(NOTES, f), 'utf8')
      return noteMeta(id, body, fs.statSync(path.join(NOTES, f)).mtime)
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

function httpError(status, message) {
  const e = new Error(message)
  e.status = status
  return e
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > 5 * 1024 * 1024) reject(httpError(413, 'body too large'))
      else chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(httpError(400, 'invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
  res.end(body)
}

async function handleApi(req, res, pathname) {
  const parts = pathname.split('/').filter(Boolean) // ['api', col, id?]
  const [, col, id] = parts

  if (col === 'health') return send(res, 200, { ok: true })

  if (COLLECTIONS.includes(col)) {
    const items = readCollection(col)
    if (req.method === 'GET' && !id) return send(res, 200, items)
    if (req.method === 'POST' && !id) {
      const body = await readBody(req)
      if (typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'expected object')
      const item = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
      items.push(item)
      writeCollection(col, items)
      return send(res, 201, item)
    }
    if (req.method === 'PATCH' && id) {
      const body = await readBody(req)
      const i = items.findIndex((x) => x.id === id)
      if (i === -1) throw httpError(404, 'not found')
      const { id: _id, createdAt: _c, ...patch } = body
      items[i] = { ...items[i], ...patch }
      writeCollection(col, items)
      return send(res, 200, items[i])
    }
    if (req.method === 'DELETE' && id) {
      const next = items.filter((x) => x.id !== id)
      if (next.length === items.length) throw httpError(404, 'not found')
      writeCollection(col, next)
      return send(res, 200, { ok: true })
    }
    throw httpError(405, 'method not allowed')
  }

  if (col === 'notes') {
    if (req.method === 'GET' && !id) return send(res, 200, listNotes())
    if (req.method === 'GET' && id) {
      const f = noteFile(id)
      if (!fs.existsSync(f)) throw httpError(404, 'not found')
      const body = fs.readFileSync(f, 'utf8')
      return send(res, 200, { ...noteMeta(id, body, fs.statSync(f).mtime), body })
    }
    if (req.method === 'POST' && !id) {
      const { body = '' } = await readBody(req)
      if (typeof body !== 'string') throw httpError(400, 'body must be a string')
      const newId = crypto.randomUUID().slice(0, 8)
      const f = noteFile(newId)
      atomicWrite(f, body)
      return send(res, 201, { ...noteMeta(newId, body, fs.statSync(f).mtime), body })
    }
    if (req.method === 'PUT' && id) {
      const { body = '' } = await readBody(req)
      if (typeof body !== 'string') throw httpError(400, 'body must be a string')
      const f = noteFile(id)
      if (!fs.existsSync(f)) throw httpError(404, 'not found')
      atomicWrite(f, body)
      return send(res, 200, { ...noteMeta(id, body, fs.statSync(f).mtime), body })
    }
    if (req.method === 'DELETE' && id) {
      const f = noteFile(id)
      if (!fs.existsSync(f)) throw httpError(404, 'not found')
      fs.unlinkSync(f)
      return send(res, 200, { ok: true })
    }
    throw httpError(405, 'method not allowed')
  }

  throw httpError(404, 'unknown endpoint')
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

function serveStatic(res, pathname) {
  let file = path.normalize(path.join(DIST, pathname === '/' ? 'index.html' : pathname))
  if (!file.startsWith(DIST)) return send(res, 403, { error: 'forbidden' })
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
  if (!fs.existsSync(file)) {
    return send(res, 503, 'HQ is not built yet. Run: npm run build', { 'Content-Type': 'text/plain' })
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`)
  try {
    if (pathname.startsWith('/api/')) await handleApi(req, res, pathname)
    else serveStatic(res, pathname)
  } catch (e) {
    const status = e.status || 500
    if (status === 500) console.error(e)
    send(res, status, { error: e.message })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`HQ running at http://localhost:${PORT}  (data in ${DATA})`)
})
