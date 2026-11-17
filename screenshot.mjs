#!/usr/bin/env node
// Usage:
//   node screenshot.mjs http://localhost:5173
//   node screenshot.mjs http://localhost:5173 overlap-grid
//   node screenshot.mjs http://localhost:5173 overlap-grid --mobile
//
// Flags: --login (sign in first using TIKCAL_TEST_EMAIL / TIKCAL_TEST_PASSWORD env vars)  --mobile (390x844)  --width=N  --height=N  --viewport (clip to fold)
// Saves to ./temporary screenshots/screenshot-N[-label].png, never overwriting.

import puppeteer from 'puppeteer'
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = 'temporary screenshots'
const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith('--'))
const [url, label] = args.filter((a) => !a.startsWith('--'))

if (!url) {
  console.error('usage: node screenshot.mjs <url> [label] [--mobile] [--width=N] [--height=N] [--viewport]')
  process.exit(1)
}

const flag = (name) => flags.includes(`--${name}`)
const flagVal = (name) => {
  const hit = flags.find((f) => f.startsWith(`--${name}=`))
  return hit ? Number(hit.split('=')[1]) : null
}

const mobile = flag('mobile')
const width = flagVal('width') ?? (mobile ? 390 : 1440)
const height = flagVal('height') ?? (mobile ? 844 : 900)
const fullPage = !flag('viewport')

// Next free index — scan existing files so we never clobber a prior capture.
async function nextIndex() {
  await mkdir(OUT_DIR, { recursive: true })
  const files = await readdir(OUT_DIR)
  const nums = files
    .map((f) => f.match(/^screenshot-(\d+)/))
    .filter(Boolean)
    .map((m) => Number(m[1]))
  return nums.length ? Math.max(...nums) + 1 : 1
}

const idx = await nextIndex()
const name = label ? `screenshot-${idx}-${label}.png` : `screenshot-${idx}.png`
const outPath = path.join(OUT_DIR, name)

const browser = await puppeteer.launch({ headless: 'new' })
try {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile })

  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))

  if (flag('login')) {
    const email = process.env.TIKCAL_TEST_EMAIL
    const pw = process.env.TIKCAL_TEST_PASSWORD
    if (!email || !pw) throw new Error('--login needs TIKCAL_TEST_EMAIL and TIKCAL_TEST_PASSWORD env vars')
    const origin = new URL(url).origin
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle0', timeout: 30_000 })
    await page.type('input[type=email]', email)
    await page.type('input[type=password]', pw)
    await Promise.all([page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20_000 }), page.click('button[type=submit]')])
  }
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })
  // Scroll the whole page so scroll-reveal sections trigger before a full-page capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 300) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  await new Promise((r) => setTimeout(r, 1200))
  await page.evaluate(() => document.fonts.ready)
  // Let CSS transitions / entrance animations settle before capturing.
  await new Promise((r) => setTimeout(r, 400))

  await page.screenshot({ path: outPath, fullPage })
  console.log(`saved ${outPath}  (${width}x${height}${fullPage ? ' fullPage' : ''})`)
  if (errors.length) {
    console.log(`\n${errors.length} console error(s):`)
    for (const e of errors.slice(0, 10)) console.log(`  - ${e}`)
  }
} catch (err) {
  if (err.message.includes('ERR_CONNECTION_REFUSED')) {
    console.error(`Nothing listening at ${url} — start the dev server first (npm run dev).`)
  } else {
    console.error(err.message)
  }
  process.exitCode = 1
} finally {
  await browser.close()
}
