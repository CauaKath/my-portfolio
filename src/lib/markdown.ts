import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import DOMPurify from 'dompurify'

import { slugify } from './slug'

// The default `highlight.js` entry point registers every supported language
// and adds roughly a megabyte to the bundle. Register only what a post here
// is plausibly going to contain; anything else falls back to plaintext.
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const LANGUAGES = {
  bash,
  css,
  go,
  java,
  javascript,
  json,
  markdown,
  plaintext,
  python,
  sql,
  typescript,
  xml,
  yaml,
}

for (const [name, language] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, language)
}

hljs.registerAliases(['js'], { languageName: 'javascript' })
hljs.registerAliases(['ts'], { languageName: 'typescript' })
hljs.registerAliases(['py'], { languageName: 'python' })
hljs.registerAliases(['sh', 'shell'], { languageName: 'bash' })
hljs.registerAliases(['html', 'vue'], { languageName: 'xml' })
hljs.registerAliases(['yml'], { languageName: 'yaml' })

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'

      return hljs.highlight(code, { language }).value
    },
  }),
)

interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

interface RenderedMarkdown {
  html: string
  toc: TocItem[]
}

// Anchors are added after sanitizing, on the already-clean DOM, so a post
// author cannot choose their own ids and DOMPurify needs no extra config.
function anchorHeadings(clean: string): RenderedMarkdown {
  const template = document.createElement('template')
  template.innerHTML = clean

  const used = new Set<string>()
  const toc: TocItem[] = []

  template.content.querySelectorAll('h2, h3').forEach((heading) => {
    const text = heading.textContent?.trim() ?? ''
    if (!text) return

    const base = slugify(text)
    let id = base
    for (let suffix = 2; used.has(id); suffix += 1) id = `${base}-${suffix}`

    used.add(id)
    heading.id = id
    toc.push({ id, text, level: heading.tagName === 'H2' ? 2 : 3 })
  })

  return { html: template.innerHTML, toc }
}

function renderMarkdownWithToc(source: string): RenderedMarkdown {
  if (!source) return { html: '', toc: [] }

  const raw = marked.parse(source, { async: false }) as string
  const clean = DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] })

  return anchorHeadings(clean)
}

function renderMarkdown(source: string): string {
  return renderMarkdownWithToc(source).html
}

export { renderMarkdown, renderMarkdownWithToc }
export type { TocItem }
