import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'

      return hljs.highlight(code, { language }).value
    },
  }),
)

function renderMarkdown(source: string): string {
  if (!source) return ''

  const raw = marked.parse(source, { async: false }) as string

  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] })
}

export { renderMarkdown }
