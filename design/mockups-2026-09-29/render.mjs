// Renders every <section class="canvas"> in the given HTML files to its own PNG @3x.
// Run from repo root: node design/mockups-2026-09-29/render.mjs set-a-afterglow.html [...]
import puppeteer from 'puppeteer'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const files = process.argv.slice(2)
const out = path.join(dir, 'png')
await mkdir(out, { recursive: true })

for (const f of files) {
  // fresh browser per file: a second page in one browser intermittently failed its load checks
  const browser = await puppeteer.launch({ args: ['--allow-file-access-from-files'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 520, height: 1000, deviceScaleFactor: 3 })
  // iconify fetches icon data from its API; retry the load if any icon never renders
  for (let attempt = 1; ; attempt++) {
    await page.goto('file://' + path.join(dir, f), { waitUntil: 'networkidle0' })
    const ok = await page.waitForFunction(() => [...document.querySelectorAll('iconify-icon')]
      .every((i) => i.shadowRoot && i.shadowRoot.querySelector('svg')), { timeout: 30000 }).then(() => true, () => false)
    if (ok) break
    const missing = await page.evaluate(() => [...document.querySelectorAll('iconify-icon')]
      .filter((i) => !(i.shadowRoot && i.shadowRoot.querySelector('svg'))).map((i) => i.getAttribute('icon')))
    if (attempt === 3) throw new Error(`${f}: icons never rendered: ${missing.join(', ')}`)
    console.warn(`${f}: retrying, missing icons: ${missing.join(', ')}`)
  }
  await page.evaluate(() => document.fonts.ready)
  const fonts = await page.evaluate((checks) => checks.map((c) => [c, document.fonts.check(c)]),
    JSON.parse(await page.evaluate(() => document.body.dataset.fonts || '[]')))
  const missing = fonts.filter(([, ok]) => !ok)
  if (missing.length) throw new Error(`${f}: fonts not loaded: ${missing.map(([c]) => c).join(', ')}`)
  await new Promise((r) => setTimeout(r, 300))
  for (const el of await page.$$('section.canvas')) {
    const id = await el.evaluate((n) => n.id)
    await el.screenshot({ path: path.join(out, `${id}.png`) })
    console.log('wrote', `png/${id}.png`)
  }
  await browser.close()
}
