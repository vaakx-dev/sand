import { a, type Child, preventThen } from '@vaakx-dev/vrui'
import { insidePath } from '../path'
import type { Shown } from '../pictures'
import { cell, element, isTag, picture, table, unshownPicture, webLink } from '../prose'
import { MAX_DEPTH, named, NS } from '../xml'

interface Scope {
  path: string
  pictures: Shown
  chapters: Map<string, number>
  go(index: number): void
}

const SKIPPED = new Set(['head', 'title', 'script', 'style', 'link', 'meta', 'iframe', 'object', 'embed', 'math', 'form', 'input', 'button', 'select', 'textarea', 'noscript', 'template', 'audio', 'video', 'canvas'])
const BLOCKS = new Set(['html', 'body', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main', 'center', 'address', 'hgroup'])

const sourceOf = (image: Element) => image.getAttribute('src') ?? image.getAttribute('href') ?? image.getAttributeNS(NS.xlink, 'href') ?? ''

const imageElements = (root: Document | Element) => [...named(root, 'img'), ...named(root, 'image')]

const imagePaths = (root: Document, path: string) => imageElements(root).flatMap(image => insidePath(path, sourceOf(image)) ?? [])

const pictureOf = (scope: Scope, image: Element) => {
  const shown = scope.pictures.get(insidePath(scope.path, sourceOf(image)) ?? '')
  if (shown?.kind === 'shown') return picture(shown.src, image.getAttribute('alt') ?? '')
  return shown ? unshownPicture(shown.note) : null
}

const chapterLink = (index: number, children: Child[], go: (index: number) => void) =>
  a({ href: '#', class: 'text-accent-400 underline', onClick: preventThen(() => go(index)) }, ...children)

const link = (scope: Scope, href: string, children: Child[]) => {
  const target = insidePath(scope.path, href)
  const index = target === undefined ? undefined : scope.chapters.get(target)
  if (index !== undefined && target !== scope.path) return chapterLink(index, children, scope.go)
  return target === undefined ? webLink(href, children) : element('span', children)
}

const markup = (scope: Scope, node: Element, name: string, depth: number) => {
  if (BLOCKS.has(name)) return [element('div', inner(scope, node, depth))]
  return isTag(name) ? [element(name, inner(scope, node, depth))] : inner(scope, node, depth)
}

const elementNode = (scope: Scope, node: Element, name: string, depth: number): Child[] => {
  switch (name) {
    case 'img':
      return [pictureOf(scope, node)]
    case 'svg':
      return imageElements(node).map(image => pictureOf(scope, image))
    case 'a':
      return [link(scope, node.getAttribute('href') ?? '', inner(scope, node, depth))]
    case 'table':
      return [table(inner(scope, node, depth))]
    case 'td':
    case 'th':
      return [cell(name, { columns: node.getAttribute('colspan'), rows: node.getAttribute('rowspan') }, inner(scope, node, depth))]
    default:
      return markup(scope, node, name, depth)
  }
}

const chapterNode = (scope: Scope, node: Node, depth: number): Child[] => {
  if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) return [node.textContent ?? '']
  if (!(node instanceof Element)) return []
  const name = node.localName.toLowerCase()
  if (SKIPPED.has(name)) return []
  if (depth > MAX_DEPTH) return [node.textContent ?? '']
  return elementNode(scope, node, name, depth)
}

const inner = (scope: Scope, node: Element, depth: number): Child[] => [...node.childNodes].flatMap(child => chapterNode(scope, child, depth + 1))

const chapterBody = (scope: Scope, document: Document) => chapterNode(scope, document.documentElement, 0)

export { chapterBody, imagePaths, type Scope }
