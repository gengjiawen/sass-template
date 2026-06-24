import { createHighlighter, type Highlighter } from 'shiki'

export type ShikiTheme = 'min-light' | 'min-dark'

let highlighterPromise: Promise<Highlighter> | null = null

function getShikiHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['min-light', 'min-dark'],
      langs: ['json'],
    })
  }
  return highlighterPromise
}

export async function highlightJson(code: string, theme: ShikiTheme): Promise<string> {
  const highlighter = await getShikiHighlighter()
  return highlighter.codeToHtml(code, {
    lang: 'json',
    theme,
  })
}
