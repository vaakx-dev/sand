import type { HtmlPages } from '../contract'
import { resolve } from 'node:path'

export interface PageSource {
  html?: string | undefined
  path?: string | undefined
}

const markup = /<[a-z!]/i

const neither = (html: string, full: string) =>
  `html must be the page's markup or the path of a file, and ${JSON.stringify(html.slice(0, 120))} is neither: it has no HTML tags and there is no file at ${full}. Pass the markup as html, or write the page to a file and pass its path.`

const markupOrFile = async (pages: HtmlPages, html: string, cwd: string) => {
  if (markup.test(html)) return pages.prepare(html, cwd)
  const full = resolve(cwd, html.trim())
  if (await Bun.file(full).exists()) return pages.load(full, cwd)
  throw new Error(neither(html, full))
}

export const readPage = (pages: HtmlPages, { html, path }: PageSource, cwd: string) => {
  if (html && path) throw new Error('Pass either html or path, not both.')
  if (html) return markupOrFile(pages, html, cwd)
  if (path) return pages.load(path, cwd)
  return undefined
}

export const missingNote = (missing: string[]) =>
  missing.length
    ? ` These image paths are not files on this machine, so they were left as written: ${missing.join(', ')}. Ignore this if they are only text.`
    : ''
