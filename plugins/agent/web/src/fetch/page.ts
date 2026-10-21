import type { Download } from './download'
import { htmlToMarkdown } from './markdown'

export interface Page {
  url: string
  title: string
  text: string
}

const partLength = 20_000

export const pageOf = ({ url, type, body }: Download): Page => {
  if (!type.includes('html')) return { url, title: '', text: body.trim() }
  const { title, markdown } = htmlToMarkdown(body, url)
  return { url, title, text: markdown }
}

export const pagePart = ({ url, title, text }: Page, offset: number) => {
  if (offset > 0 && offset >= text.length) throw new Error(`The page has ${text.length} characters, so offset ${offset} is past the end`)
  const end = offset + partLength
  const more = end < text.length ? `\n\n[Characters ${offset} to ${end} of ${text.length}. Call web_fetch with offset ${end} for more.]` : ''
  return `${title ? `Title: ${title}\n` : ''}URL: ${url}\n\n${text.slice(offset, end) || '(The page has no readable text.)'}${more}`
}
