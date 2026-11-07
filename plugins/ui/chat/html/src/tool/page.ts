import type { HtmlPages } from '../contract'

export interface PageSource {
  html?: string | undefined
  path?: string | undefined
}

const markup = /<[a-z!]/i

const notMarkup = (html: string) =>
  `html must be the page's markup itself, and ${JSON.stringify(html.slice(0, 120))} has no HTML tags. To show a file, pass its path as path and leave html out.`

export const readPage = (pages: HtmlPages, { html, path }: PageSource, cwd: string) => {
  if (html && path) throw new Error('Pass either html or path, not both.')
  if (html && !markup.test(html)) throw new Error(notMarkup(html))
  if (html) return pages.prepare(html, cwd)
  if (path) return pages.load(path, cwd)
  return undefined
}

export const missingNote = (missing: string[]) =>
  missing.length
    ? ` These image paths are not files on this machine, so they were left as written: ${missing.join(', ')}. Ignore this if they are only text.`
    : ''
