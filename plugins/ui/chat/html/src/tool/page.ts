import type { HtmlPages } from '../contract'

export interface PageSource {
  html?: string | undefined
  path?: string | undefined
}

export const readPage = (pages: HtmlPages, { html, path }: PageSource, cwd: string) => {
  if (html && path) throw new Error('Pass either html or path, not both.')
  if (html) return pages.prepare(html, cwd)
  if (path) return pages.load(path, cwd)
  return undefined
}

export const missingNote = (missing: string[]) =>
  missing.length
    ? ` These image paths are not files on this machine, so they were left as written: ${missing.join(', ')}. Ignore this if they are only text.`
    : ''
