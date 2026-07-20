// Rasterize an SVG file to PNG at one or more sizes using the bundled Chromium.
//   node design/render-icon.mjs <svg> <outDir> <size1> [size2 ...]
import puppeteer from 'puppeteer'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'

const [svgPath, outDir, ...sizes] = process.argv.slice(2)
if (!svgPath || !outDir || sizes.length === 0) {
  console.error('usage: node design/render-icon.mjs <svg> <outDir> <size...>')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
const svg = readFileSync(svgPath, 'utf8')
const stem = basename(svgPath).replace(/\.svg$/, '')

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setContent(
  `<!doctype html><html><body style="margin:0;padding:0;background:transparent">${svg}</body></html>`,
  { waitUntil: 'networkidle0' }
)
for (const s of sizes.map(Number)) {
  await page.setViewport({ width: s, height: s, deviceScaleFactor: 1 })
  await page.evaluate((sz) => {
    const el = document.querySelector('svg')
    el.setAttribute('width', sz)
    el.setAttribute('height', sz)
    el.style.display = 'block'
  }, s)
  const el = await page.$('svg')
  const out = join(outDir, `${stem}-${s}.png`)
  await el.screenshot({ path: out, omitBackground: true })
  console.log('wrote', out)
}
await browser.close()
