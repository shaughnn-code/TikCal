import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from './markdown.js'

test('headings', () => {
  assert.equal(renderMarkdown('# Title'), '<h1>Title</h1>')
  assert.equal(renderMarkdown('### Deep'), '<h3>Deep</h3>')
})

test('paragraphs and inline styles', () => {
  assert.equal(
    renderMarkdown('some **bold** and *italic* and `code`'),
    '<p>some <strong>bold</strong> and <em>italic</em> and <code>code</code></p>'
  )
})

test('lists open and close', () => {
  assert.equal(renderMarkdown('- a\n- b'), '<ul>\n<li>a</li>\n<li>b</li>\n</ul>')
  assert.equal(renderMarkdown('1. a\n2. b'), '<ol>\n<li>a</li>\n<li>b</li>\n</ol>')
  assert.ok(renderMarkdown('- a\n\ntext').endsWith('<p>text</p>'))
})

test('escapes HTML — no script injection', () => {
  const html = renderMarkdown('<script>alert(1)</script>')
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
})

test('links are sanitized', () => {
  assert.ok(renderMarkdown('[x](https://a.b)').includes('href="https://a.b"'))
  assert.ok(renderMarkdown('[x](javascript:alert(1))').includes('href="#"'))
})

test('code blocks are literal', () => {
  const html = renderMarkdown('```\n- not a list\n```')
  assert.ok(html.includes('<pre><code>'))
  assert.ok(html.includes('- not a list'))
  assert.ok(!html.includes('<li>'))
})

test('blockquote and hr', () => {
  assert.equal(renderMarkdown('> hi'), '<blockquote>hi</blockquote>')
  assert.equal(renderMarkdown('---'), '<hr/>')
})
