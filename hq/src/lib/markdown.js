// Tiny markdown -> HTML renderer for note previews. Escapes all input first,
// so rendered notes can never inject markup or scripts.

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function safeHref(url) {
  return /^(https?:\/\/|mailto:|#)/i.test(url) ? url : '#'
}

function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
      return `<a href="${safeHref(url)}" target="_blank" rel="noreferrer">${text}</a>`
    })
}

export function renderMarkdown(md) {
  const lines = escapeHtml(md).split('\n')
  const out = []
  let list = null // 'ul' | 'ol' | null
  let inCode = false

  const closeList = () => {
    if (list) out.push(`</${list}>`)
    list = null
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      closeList()
      out.push(inCode ? '</code></pre>' : '<pre><code>')
      inCode = !inCode
      continue
    }
    if (inCode) {
      out.push(line)
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line.trim())) {
      closeList()
      out.push('<hr/>')
      continue
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/)
    const ol = line.match(/^\s*\d+\.\s+(.*)$/)
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol'
      if (list !== kind) {
        closeList()
        out.push(`<${kind}>`)
        list = kind
      }
      out.push(`<li>${inline((ul || ol)[1])}</li>`)
      continue
    }

    const quote = line.match(/^&gt;\s?(.*)$/)
    if (quote) {
      closeList()
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`)
      continue
    }

    closeList()
    if (line.trim() === '') continue
    out.push(`<p>${inline(line)}</p>`)
  }
  if (inCode) out.push('</code></pre>')
  closeList()
  return out.join('\n')
}
