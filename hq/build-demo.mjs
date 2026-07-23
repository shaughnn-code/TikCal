// Packs the whole app into one self-contained HTML file (hq-demo.html) that
// runs from a double-click — no server, data kept in the browser's storage.
//   npx vite build --config vite.artifact.config.js && node build-demo.mjs
import fs from 'node:fs'

const built = fs.readFileSync('dist-artifact/artifact/index.html', 'utf8')
const jsFile = built.match(/src="\/(assets\/[^"]+\.js)"/)?.[1]
const cssFile = built.match(/href="\/(assets\/[^"]+\.css)"/)?.[1]
if (!jsFile || !cssFile) throw new Error('could not find built assets in dist-artifact')

const js = fs.readFileSync(`dist-artifact/${jsFile}`, 'utf8').replaceAll('</script', '<\\/script')
const css = fs.readFileSync(`dist-artifact/${cssFile}`, 'utf8')

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HQ — personal headquarters</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${js}</script>
</body>
</html>
`
fs.writeFileSync('hq-demo.html', html)
console.log(`wrote hq-demo.html (${(html.length / 1024).toFixed(0)} kB)`)
