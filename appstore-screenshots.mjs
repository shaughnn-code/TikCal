#!/usr/bin/env node
// One-off: capture 3 App Store preview screenshots at the 6.9" required size (1320x2868).
// Logs in as the demo reviewer account, hits calendar / event detail / friends, then quits.

import puppeteer from 'puppeteer'
import { mkdir } from 'node:fs/promises'

const OUT_DIR = 'appstore screenshots'
const BASE = 'http://localhost:5173'
const EMAIL = process.env.SCREENSHOT_EMAIL
const PASSWORD = process.env.SCREENSHOT_PASSWORD
if (!EMAIL || !PASSWORD) {
  console.error('Set SCREENSHOT_EMAIL and SCREENSHOT_PASSWORD (e.g. in .env, then `export $(cat .env | xargs)`) before running.')
  process.exit(1)
}

await mkdir(OUT_DIR, { recursive: true })

const browser = await puppeteer.launch({ headless: 'new' })
const page = await browser.newPage()
// Logical CSS viewport for iPhone 13/14 Pro Max (428x926pt) at 3x = 1284x2778px output,
// matching Apple's required 6.7" App Store screenshot size while triggering mobile layout.
await page.setViewport({ width: 428, height: 926, deviceScaleFactor: 3, isMobile: true, hasTouch: true })

async function settle() {
  await page.evaluate(() => document.fonts.ready)
  await new Promise((r) => setTimeout(r, 500))
}

// Log in
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' })
await page.waitForSelector('input[type=email]')
await page.type('input[type=email]', EMAIL)
await page.type('input[type=password]', PASSWORD)
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0' }),
  page.click('button[type=submit]'),
])
await settle()
console.log('logged in, now at', page.url())

// 1. Calendar (main dashboard)
await page.goto(`${BASE}/calendar`, { waitUntil: 'networkidle0' })
await settle()
await page.screenshot({ path: `${OUT_DIR}/1-calendar.png` })
console.log('saved 1-calendar.png')

// 2. Event detail (known demo event: Mau P @ Brooklyn Army Terminal)
await page.goto(`${BASE}/events/aad170ba-6206-4d82-9a2f-8516f5937466`, { waitUntil: 'networkidle0' })
await settle()
await page.screenshot({ path: `${OUT_DIR}/2-event-detail.png` })
console.log('saved 2-event-detail.png')

// 3. Crew (has real content — the demo account owns a crew)
await page.goto(`${BASE}/friends`, { waitUntil: 'networkidle0' })
await settle()
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().toUpperCase().startsWith('CREWS'))
  if (btn) { btn.click(); return true }
  return false
})
if (clicked) {
  await settle()
} else {
  console.log('CREWS tab button not found — screenshotting default tab')
}
await page.screenshot({ path: `${OUT_DIR}/3-crew.png` })
console.log('saved 3-crew.png')

await browser.close()
