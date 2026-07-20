// Capture a URL after a fixed delay (no networkidle — Vite's HMR socket never
// idles). Usage: node design/capture.mjs <url> <outfile> [--mobile] [--delay=ms]
import puppeteer from 'puppeteer'
const args = process.argv.slice(2)
const [url, out] = args.filter((a) => !a.startsWith('--'))
const mobile = args.includes('--mobile')
const delay = Number((args.find((a) => a.startsWith('--delay=')) || '').split('=')[1]) || 1200
const browser = await puppeteer.launch({ headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: mobile ? 390 : 1200, height: mobile ? 844 : 860, deviceScaleFactor: 2 })
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
await new Promise((r) => setTimeout(r, delay))
await page.screenshot({ path: out })
console.log('saved', out)
await browser.close()
