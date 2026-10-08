import { describe, it, expect } from 'vitest'
import { renderMarkdown, renderMarkdownWithToc } from '../markdown'

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

describe('renderMarkdownWithToc', () => {
  it('adds ids to h2 and h3 headings and lists them', () => {
    const { html, toc } = renderMarkdownWithToc('# Top\n\n## Under the hood\n\n### Deep dive')

    expect(html).toContain('<h2 id="under-the-hood">')
    expect(html).toContain('<h3 id="deep-dive">')
    expect(toc).toEqual([
      { id: 'under-the-hood', text: 'Under the hood', level: 2 },
      { id: 'deep-dive', text: 'Deep dive', level: 3 },
    ])
  })

  it('keeps ids unique for repeated headings', () => {
    const { toc } = renderMarkdownWithToc('## Summary\n\n## Summary')

    expect(toc.map((item) => item.id)).toEqual(['summary', 'summary-2'])
  })

  it('uses plain text for headings with inline markup', () => {
    const { toc } = renderMarkdownWithToc('## The `struct{}` claim')

    expect(toc[0].text).toBe('The struct{} claim')
  })

  it('does not let an author inject their own heading id', () => {
    const { html } = renderMarkdownWithToc('<h2 id="evil">Hello</h2>')

    expect(html).not.toContain('evil')
    expect(html).toContain('id="hello"')
  })

  it('returns no toc for empty input', () => {
    expect(renderMarkdownWithToc('')).toEqual({ html: '', toc: [] })
  })
})
