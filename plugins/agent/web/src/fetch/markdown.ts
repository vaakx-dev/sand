import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import TurndownService from 'turndown'

const shortArticle = 200

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' })
turndown.remove(['script', 'style', 'noscript', 'iframe', 'form', 'button'])
turndown.addRule('image alt text', { filter: 'img', replacement: (_content, image) => image.getAttribute('alt')?.trim() ?? '' })

const absoluteLinks = (document: Document, base: string) => {
  for (const link of document.querySelectorAll('a[href]')) {
    const href = URL.parse(link.getAttribute('href') ?? '', base)
    if (href) link.setAttribute('href', href.href)
  }
}

export const htmlToMarkdown = (html: string, url: string) => {
  const { document } = parseHTML(html)
  const title = document.title.trim()
  absoluteLinks(document, url)
  const whole = document.body?.innerHTML ?? html
  const article = new Readability(document).parse()
  const content = article?.content && (article.textContent?.trim().length ?? 0) >= shortArticle ? article.content : whole
  const markdown = turndown.turndown(content).replace(/\n{3,}/g, '\n\n').trim()
  return { title: article?.title?.trim() || title, markdown }
}
