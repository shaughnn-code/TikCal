// Regenerates the source art in this directory, which @capacitor/assets then
// fans out into ios/ and android/:
//
//   node assets/generate-source-art.mjs
//   npx capacitor-assets generate --ios --android
//
// Pass --ios --android or the generator ALSO rewrites public/manifest.webmanifest
// (with broken ../icons/*.webp paths) and drops a stray icons/ dir at the repo
// root. The web PWA icon set is maintained by hand; leave it alone.
//
// The art is rendered in headless Chrome from the app's own CSS: the real
// self-hosted Barlow 800 italic face and the liquid-chrome gradient from
// .logo-3d in src/index.css, over the Aurora light-leak from .grid-glow. So the
// icon is the actual wordmark treatment rather than a lookalike, and it tracks
// the design tokens instead of drifting from them.
import puppeteer from 'puppeteer'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
mkdirSync(HERE, { recursive: true })

const barlow = readFileSync(path.join(ROOT, 'public/fonts/barlow-800i-latin.woff2')).toString('base64')

const INK = '#0b0b11'

// The .grid-glow light-leak baked flat: magenta core → violet → iris tail,
// over the faint violet floor grid.
const bloom = (scale = 1) => `
  <div style="position:absolute;inset:0;filter:blur(${52 * scale}px);opacity:1;
              background:
                radial-gradient(46% 40% at 74% 10%, rgba(216,75,255,.85), transparent 70%),
                radial-gradient(52% 44% at 40% -6%, rgba(150,92,255,.72), transparent 72%),
                radial-gradient(40% 36% at 100% 30%, rgba(91,107,255,.6), transparent 70%),
                radial-gradient(60% 40% at 8% -8%, rgba(150,60,220,.38), transparent 76%);"></div>
  <div style="position:absolute;left:-25%;right:-25%;bottom:-2px;height:46%;opacity:.85;
              background-image:
                linear-gradient(rgba(160,120,255,.38) ${2 * scale}px, transparent ${2 * scale}px),
                linear-gradient(90deg, rgba(160,120,255,.38) ${2 * scale}px, transparent ${2 * scale}px);
              background-size:${62 * scale}px ${62 * scale}px;
              transform:perspective(${420 * scale}px) rotateX(75deg);transform-origin:bottom center;
              -webkit-mask-image:linear-gradient(to top,#000 4%,transparent 78%);"></div>
  <div style="position:absolute;left:-20%;bottom:-14%;width:80%;height:58%;filter:blur(${80 * scale}px);opacity:.75;
              background:radial-gradient(50% 50% at 32% 78%, rgba(91,107,255,.4), transparent 72%);"></div>`

// Verbatim from .logo-3d — silver mirror gradient, dark rim, violet outer glow.
const chrome = (px, strokeW, glowScale = 1) => `
  font-family:'Barlow';font-weight:800;font-style:italic;letter-spacing:-.02em;line-height:1;
  font-size:${px}px;
  background:linear-gradient(180deg,
    #ffffff 0%, #eef2f8 12%, #b9c3d3 30%, #7c8698 43%,
    #363d4c 49%, #444c5d 51%,
    #f4f7fb 56%, #c3ccda 70%, #8f9aac 84%, #d6dee9 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;
  -webkit-text-stroke:${strokeW}px rgba(35,42,58,.55);
  filter:
    drop-shadow(0 ${1 * glowScale}px 0 rgba(255,255,255,.35))
    drop-shadow(0 ${2 * glowScale}px ${4 * glowScale}px rgba(0,0,0,.65))
    drop-shadow(0 0 ${16 * glowScale}px rgba(198,208,232,.5))
    drop-shadow(0 0 ${40 * glowScale}px rgba(139,92,255,.35));`

const page = (size, inner, bg = INK) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Barlow';font-style:italic;font-weight:800;
             src:url(data:font/woff2;base64,${barlow}) format('woff2');}
  html,body{margin:0;padding:0;}
  body{width:${size}px;height:${size}px;overflow:hidden;background:${bg};}
  .stage{position:relative;width:${size}px;height:${size}px;overflow:hidden;
         display:flex;align-items:center;justify-content:center;background:${bg};}
  .mark{position:relative;z-index:2;}
</style></head><body><div class="stage">${inner}</div></body></html>`

// "TC", not the full wordmark: at 60px on a home screen "TikCal" is a smear.
// The trailing advance of the italic leaves it optically left-of-centre, so it
// gets nudged right — the same correction Logo makes in ui.jsx.
const ICON = page(1024, `${bloom(1)}<div class="mark" style="${chrome(380, 3, 1.35)};transform:translateX(3%) translateY(-2%);">TC</div>`)

// Android adaptive foreground, transparent. mipmap-anydpi-v26/ic_launcher.xml
// insets this drawable a further 16.7% per side, so the mark is drawn large
// here to land at roughly half the height of the 72dp visible mask.
const ICON_FG = page(
  1024,
  `<div class="mark" style="${chrome(480, 3, 1.35)};transform:translateX(3%);">TC</div>`,
  'transparent',
)
const ICON_BG = page(1024, bloom(1))

// Splash art is 2732² and scaleAspectFill'd onto the device, which on a tall
// phone leaves only the central ~45% of the width visible. So the composition
// has to be radially symmetric about the centre — an off-centre light-leak like
// the icon's would simply get cropped away. Centred violet halo + a top wash.
const SPLASH_BLOOM = `
  <div style="position:absolute;inset:-20%;filter:blur(150px);
              background:
                radial-gradient(38% 30% at 50% 50%, rgba(150,92,255,.5), transparent 70%),
                radial-gradient(70% 34% at 50% 4%,  rgba(200,75,255,.55), transparent 72%),
                radial-gradient(60% 26% at 50% 100%, rgba(91,107,255,.34), transparent 74%);"></div>
  <div style="position:absolute;left:-25%;right:-25%;bottom:-2px;height:34%;opacity:.7;
              background-image:
                linear-gradient(rgba(160,120,255,.34) 5px, transparent 5px),
                linear-gradient(90deg, rgba(160,120,255,.34) 5px, transparent 5px);
              background-size:160px 160px;
              transform:perspective(1100px) rotateX(75deg);transform-origin:bottom center;
              -webkit-mask-image:linear-gradient(to top,#000 4%,transparent 78%);"></div>`
const SPLASH = page(2732, `${SPLASH_BLOOM}<div class="mark" style="${chrome(430, 3, 1.9)};transform:translateX(1.4%);">TikCal</div>`)

const browser = await puppeteer.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] })

// splash-dark is a copy: TikCal has no light mode to differ from.
for (const [name, html, size, transparent] of [
  ['icon.png', ICON, 1024, false],
  ['icon-foreground.png', ICON_FG, 1024, true],
  ['icon-background.png', ICON_BG, 1024, false],
  ['splash.png', SPLASH, 2732, false],
  ['splash-dark.png', SPLASH, 2732, false],
]) {
  const p = await browser.newPage()
  await p.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
  await p.setContent(html, { waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  const buf = await p.screenshot({ type: 'png', omitBackground: transparent })
  writeFileSync(path.join(HERE, name), buf)
  console.log(`assets/${name}  ${size}×${size}  ${(buf.length / 1024).toFixed(0)}kB`)
  await p.close()
}
await browser.close()
