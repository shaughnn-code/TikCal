// End-to-end acceptance walkthrough. Boots the real server against a
// throwaway data dir, drives the built app in a real browser, then restarts
// the server to prove persistence. Fails on any browser console error.
//
//   npm run build && node e2e.mjs
//
// Needs a Chrome/Chromium binary: set CHROME_PATH, or common locations are tried.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const PORT = 5391
const BASE = `http://localhost:${PORT}`
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-e2e-'))
const TASK_TITLE = 'Ship the HQ walkthrough'
const NOTE_LINE = 'Walkthrough scratch note'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)
const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p))
if (!chrome) throw new Error('No Chrome found — set CHROME_PATH')

let server = null
function startServer() {
  server = spawn('node', ['server.mjs'], {
    env: { ...process.env, HQ_PORT: String(PORT), HQ_DATA: DATA },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server did not start')), 5000)
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`${BASE}/api/health`)
        if (r.ok) {
          clearTimeout(t)
          clearInterval(poll)
          resolve()
        }
      } catch {}
    }, 100)
  })
}
function stopServer() {
  return new Promise((resolve) => {
    if (!server) return resolve()
    server.on('exit', resolve)
    server.kill()
  })
}

const errors = []
let passed = 0
function step(name) {
  passed += 1
  console.log(`  ok ${String(passed).padStart(2)}  ${name}`)
}
function fail(msg) {
  throw new Error(msg)
}

// ---- helpers over the page ----
// Case-insensitive: CSS text-transform (e.g. .label uppercasing) shows up in innerText.
async function waitForText(page, text, where = 'body') {
  await page
    .waitForFunction(
      (t, sel) => (document.querySelector(sel)?.innerText || '').toLowerCase().includes(t),
      { timeout: 8000 },
      text.toLowerCase(),
      where
    )
    .catch(() => fail(`expected to see "${text}" in ${where}`))
}
async function clickByText(page, selector, text) {
  const ok = await page.evaluate(
    (sel, t) => {
      // Smallest match = most specific; a click on it bubbles to the real handler.
      const matches = [...document.querySelectorAll(sel)]
        .filter((e) => (e.innerText || '').toLowerCase().includes(t))
        .sort((a, b) => a.innerText.length - b.innerText.length)
      if (!matches.length) return false
      matches[0].click()
      return true
    },
    selector,
    text.toLowerCase()
  )
  if (!ok) fail(`nothing matching <${selector}> with text "${text}" to click`)
}
// React-controlled inputs need the native setter + input event.
async function setValue(page, selector, value) {
  const ok = await page.evaluate(
    (sel, v) => {
      const el = document.querySelector(sel)
      if (!el) return false
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    },
    selector,
    value
  )
  if (!ok) fail(`no element ${selector}`)
}
async function goto(page, hash) {
  await page.evaluate((h) => (window.location.hash = h), hash)
  await new Promise((r) => setTimeout(r, 400))
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function main() {
  await startServer()
  console.log(`server up, data in ${DATA}`)

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`))

  // 1. Tasks: add a real task with today's due date.
  await page.goto(`${BASE}/#/tasks`, { waitUntil: 'networkidle0' })
  await waitForText(page, 'Tasks')
  await setValue(page, 'input[placeholder="Add a task…"]', TASK_TITLE)
  await setValue(page, 'input[type="date"]', today())
  await clickByText(page, 'button', 'Add')
  await waitForText(page, TASK_TITLE)
  await waitForText(page, 'Today')
  step('task added and grouped under Today')

  // 2. Calendar: the task shows up on today automatically.
  await goto(page, '#/calendar')
  await waitForText(page, TASK_TITLE)
  step('task appears on the calendar')

  // 3. Board: same task as a card.
  await goto(page, '#/board')
  await waitForText(page, TASK_TITLE)
  step('task appears on the kanban board')

  // 4. Focus: start the timer against that task.
  await goto(page, '#/focus')
  await waitForText(page, 'Focus')
  await clickByText(page, 'button, [role="radio"], label, div[class*="cursor"]', TASK_TITLE)
  await clickByText(page, 'button', 'Start')
  await waitForText(page, 'focusing')
  step('timer started against the task')

  // 5. Attach a fresh note mid-session.
  await clickByText(page, 'button', 'New note')
  await setValue(page, 'textarea', `# ${NOTE_LINE}\n\nWritten mid-focus.`)
  await clickByText(page, 'button', 'Save')
  await waitForText(page, NOTE_LINE)
  step('note created and attached mid-session')

  // 6. Let it run long enough to be loggable, then finish.
  await new Promise((r) => setTimeout(r, 6000))
  await clickByText(page, 'button', 'Finish')
  await waitForText(page, 'ready')
  await waitForText(page, '1 session')
  step('session finished and logged')

  // 7. Calendar shows the focus block; sidebar totals visible on the task.
  await goto(page, '#/calendar')
  await waitForText(page, TASK_TITLE)
  step('calendar still shows the day with the task')

  // 8. Notes: note exists, backlinked to the task.
  await goto(page, '#/notes')
  await waitForText(page, NOTE_LINE)
  await clickByText(page, 'button, a, div', NOTE_LINE)
  await waitForText(page, TASK_TITLE)
  step('note listed with task backlink')

  // 9. Data on disk is plain and readable.
  const tasks = JSON.parse(fs.readFileSync(path.join(DATA, 'tasks.json'), 'utf8'))
  const sessions = JSON.parse(fs.readFileSync(path.join(DATA, 'sessions.json'), 'utf8'))
  const noteFiles = fs.readdirSync(path.join(DATA, 'notes'))
  if (tasks.length !== 1 || tasks[0].title !== TASK_TITLE) fail('tasks.json wrong')
  if (sessions.length !== 1 || sessions[0].taskId !== tasks[0].id) fail('session not linked to task')
  if (sessions[0].seconds < 5) fail('session too short')
  if (noteFiles.length !== 1) fail('expected one note file')
  if (tasks[0].noteIds.length !== 1) fail('note not attached to task')
  step('data on disk: 1 task, 1 linked session, 1 attached note')

  // 10. Restart the server — everything must survive.
  await stopServer()
  await startServer()
  await page.reload({ waitUntil: 'networkidle0' })
  await goto(page, '#/tasks')
  await waitForText(page, TASK_TITLE)
  await goto(page, '#/focus')
  await waitForText(page, '1 session')
  await goto(page, '#/notes')
  await waitForText(page, NOTE_LINE)
  step('server restarted — task, session and note all survived')

  await browser.close()
  await stopServer()

  if (errors.length) {
    console.error('\nBrowser errors:')
    for (const e of errors) console.error('  ' + e)
    process.exit(1)
  }
  console.log(`\nAll ${passed} steps passed, zero browser errors.`)
  fs.rmSync(DATA, { recursive: true, force: true })
}

main().catch(async (e) => {
  console.error('\nFAILED: ' + e.message)
  if (errors.length) for (const err of errors) console.error('  ' + err)
  await stopServer()
  process.exit(1)
})
