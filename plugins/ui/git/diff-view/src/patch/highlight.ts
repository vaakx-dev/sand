import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'

export type Highlight = NonNullable<Parameters<Kit['diffRow']>[1]>

const languageOf = (path: string) => {
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export const highlighter = (markdown: Markdown | undefined, path: string): Highlight | undefined => {
  const language = languageOf(path)
  return markdown && language ? code => markdown.highlight(code, language) : undefined
}
