import type { OpenFile } from '@sand/file-viewer/contract'
import { a, div, el, em, h1, h2, h3, h4, img, li, ol, p, span, strong, table, td, th, tr, ul } from '@vaakx-dev/vrui'

type Inline = Node | string

const SAFE_LINK = /^(?:https?:|mailto:)/i

const anchorOf = (element: Element) => element.getAttribute('id') ?? undefined

const spanOf = (element: Element, name: string) => Number(element.getAttribute(name) ?? 1) || 1

const jump = (event: MouseEvent, target: string) => {
  event.preventDefault()
  const link = event.currentTarget
  if (!(link instanceof Element)) return
  link.closest('[data-word]')?.querySelector(`[data-anchor="${CSS.escape(target)}"]`)?.scrollIntoView({ block: 'start' })
}

const link = (element: Element, label: Inline[], file: OpenFile) => {
  const href = element.getAttribute('href')
  const shared = { class: 'text-neutral-100 underline hover:text-neutral-400', 'data-anchor': anchorOf(element) }
  if (href === null) return span({ 'data-anchor': shared['data-anchor'] }, label)
  if (href.startsWith('#')) return a({ ...shared, href, onClick: (event: MouseEvent) => jump(event, href.slice(1)) }, label)
  if (SAFE_LINK.test(href)) return a({ ...shared, href, target: '_blank', rel: 'noopener noreferrer', referrerPolicy: 'no-referrer' }, label)
  return file.link(href, label) ?? span(label)
}

const image = (element: Element) => {
  const src = element.getAttribute('src') ?? ''
  const alt = element.getAttribute('alt') ?? ''
  if (!src.startsWith('data:image/')) return span({ class: 'text-xs text-neutral-500' }, alt ? `[Image: ${alt}]` : '[Image not shown]')
  return img({ src, alt, class: 'my-2 inline-block h-auto max-w-full rounded-sm' })
}

const cell = (element: Element, content: Inline[]) =>
  (element.localName === 'th' ? th : td)(
    { class: 'border border-neutral-800 px-2 py-1 text-left align-top', colSpan: spanOf(element, 'colspan'), rowSpan: spanOf(element, 'rowspan') },
    content,
  )

const rowsOf = (element: Element, file: OpenFile) =>
  [...element.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr')].map(row => tr([...row.children].map(found => cell(found, inlineNodes(found, file)))))

const nodeOf = (node: ChildNode, file: OpenFile): Inline | Inline[] => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (!(node instanceof Element)) return []
  const content = () => inlineNodes(node, file)
  const anchor = anchorOf(node)
  switch (node.localName) {
    case 'h1':
      return h1({ class: 'mt-8 mb-3 text-2xl leading-tight font-semibold first:mt-0', 'data-anchor': anchor }, content())
    case 'h2':
      return h2({ class: 'mt-6 mb-2 text-xl leading-snug font-semibold first:mt-0', 'data-anchor': anchor }, content())
    case 'h3':
      return h3({ class: 'mt-5 mb-1.5 text-lg leading-snug font-semibold first:mt-0', 'data-anchor': anchor }, content())
    case 'h4':
    case 'h5':
    case 'h6':
      return h4({ class: 'mt-4 mb-1 text-base font-semibold first:mt-0', 'data-anchor': anchor }, content())
    case 'p':
      return p({ class: 'mb-3 last:mb-0', 'data-anchor': anchor }, content())
    case 'ul':
    case 'ol':
      return (node.localName === 'ul' ? ul : ol)({ class: 'mb-3 pl-6 last:mb-0' }, content())
    case 'li':
      return li({ class: 'mb-1 marker:text-neutral-500', 'data-anchor': anchor }, content())
    case 'table':
      return div({ class: 'mb-4 overflow-x-auto' }, table({ class: 'border-collapse' }, rowsOf(node, file)))
    case 'strong':
      return strong({ class: 'font-semibold' }, content())
    case 'em':
      return em(content())
    case 'u':
    case 's':
    case 'sup':
    case 'sub':
      return el(node.localName, content())
    case 'a':
      return link(node, content(), file)
    case 'br':
      return el('br')
    case 'img':
      return image(node)
    default:
      return content()
  }
}

const inlineNodes = (parent: Element, file: OpenFile): Inline[] => [...parent.childNodes].flatMap(node => nodeOf(node, file))

const nodesOf = (html: string, file: OpenFile) => inlineNodes(new DOMParser().parseFromString(html, 'text/html').body, file)

export { nodesOf }
