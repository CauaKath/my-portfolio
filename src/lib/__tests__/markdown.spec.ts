import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../markdown'

describe('renderMarkdown', () => {
  it('renders basic markdown', () => {
    expect(renderMarkdown('# Título')).toContain('<h1')
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>')
  })

  it('highlights fenced code blocks', () => {
    const html = renderMarkdown('```js\nconst a = 1\n```')
    expect(html).toContain('hljs')
    expect(html).toContain('language-js')
  })

  it('falls back to plaintext for an unknown language without throwing', () => {
    // marked-highlight still emits `language-notalanguage` as a class; what
    // matters is that hljs.getLanguage() returning undefined does not throw.
    const html = renderMarkdown('```notalanguage\nx\n```')
    expect(html).toContain('<code')
    expect(html).toContain('x')
  })

  it('strips script tags', () => {
    const html = renderMarkdown('hello <script>alert(1)</script>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
  })

  it('strips event handler attributes', () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">')
    expect(html).not.toContain('onerror')
  })

  it('strips javascript: URLs', () => {
    const html = renderMarkdown('[click](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })

  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })
})
