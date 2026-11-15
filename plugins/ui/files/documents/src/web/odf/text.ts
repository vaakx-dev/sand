import { type Child, div, span } from '@vaakx-dev/vrui'
import { insidePath } from '../path'
import type { Shown } from '../pictures'
import { cell, element, picture, spaces, table, unshownPicture, webLink } from '../prose'
import { attribute, descendants, MAX_DEPTH, qualified } from '../xml'
import type { Looks } from './styles'

interface Scope {
  looks: Looks
  pictures: Shown
}

const MAX_SPACES = 1_000
const MAX_REPEAT = 100

const SKIPPED = new Set([
  'office:annotation',
  'office:annotation-end',
  'office:forms',
  'office:scripts',
  'text:tracked-changes',
  'text:note-body',
  'text:sequence-decls',
  'table:covered-table-cell',
  'draw:object',
  'draw:object-ole',
  'presentation:notes',
])

const imagePath = (image: Element) => insidePath('content.xml', attribute(image, 'xlink', 'href') ?? '')

const imagePaths = (root: Document) => descendants(root, 'draw', 'image').flatMap(image => imagePath(image) ?? [])

const repeat = (value: string | null, max: number) => {
  const count = Number(value ?? 1)
  return Number.isInteger(count) && count > 1 ? Math.min(count, max) : 1
}

const styled = (scope: Scope, element: Element, children: Child[]) => {
  const look = scope.looks.get(attribute(element, 'text', 'style-name') ?? '')
  return look ? [span({ class: look }, ...children)] : children
}

const headingLevel = (heading: Element) => Math.min(Math.max(repeat(attribute(heading, 'text', 'outline-level'), 6), 1), 6)

const headingTag = (heading: Element) => (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const)[headingLevel(heading) - 1] ?? 'h6'

const pictureOf = (scope: Scope, image: Element) => {
  const shown = scope.pictures.get(imagePath(image) ?? '')
  if (shown?.kind === 'shown') return picture(shown.src, '')
  return shown ? unshownPicture(shown.note) : null
}

const tableCell = (scope: Scope, node: Element, depth: number) => {
  const contents = inner(scope, node, depth)
  const spans = { columns: attribute(node, 'table', 'number-columns-spanned'), rows: attribute(node, 'table', 'number-rows-spanned') }
  return Array.from({ length: repeat(attribute(node, 'table', 'number-columns-repeated'), MAX_REPEAT) }, () => cell('td', spans, contents.map(child => (child instanceof Node ? child.cloneNode(true) : child))))
}

const tableRow = (scope: Scope, node: Element, depth: number) => {
  const row = element('tr', inner(scope, node, depth))
  return Array.from({ length: repeat(attribute(node, 'table', 'number-rows-repeated'), MAX_REPEAT) }, (_, index) => (index ? row.cloneNode(true) : row))
}

const frame = (scope: Scope, node: Element, depth: number) => {
  const children = inner(scope, node, depth)
  return attribute(node, 'presentation', 'class') === 'title' ? [div({ class: 'text-lg font-semibold' }, ...children)] : children
}

const elementNode = (scope: Scope, node: Element, depth: number): Child[] => {
  switch (qualified(node)) {
    case 'text:s':
      return [spaces(' '.repeat(repeat(attribute(node, 'text', 'c'), MAX_SPACES)))]
    case 'text:tab':
      return [spaces('\t')]
    case 'text:line-break':
      return [element('br', [])]
    case 'text:p':
      return [element('p', styled(scope, node, inner(scope, node, depth)))]
    case 'text:h':
      return [element(headingTag(node), inner(scope, node, depth))]
    case 'text:span':
      return styled(scope, node, inner(scope, node, depth))
    case 'text:a':
      return [webLink(attribute(node, 'xlink', 'href') ?? '', inner(scope, node, depth))]
    case 'text:list':
      return [element('ul', inner(scope, node, depth))]
    case 'text:list-item':
    case 'text:list-header':
      return [element('li', inner(scope, node, depth))]
    case 'text:note-citation':
      return [element('sup', inner(scope, node, depth))]
    case 'table:table':
      return [table([element('tbody', inner(scope, node, depth))])]
    case 'table:table-row':
      return tableRow(scope, node, depth)
    case 'table:table-cell':
      return tableCell(scope, node, depth)
    case 'draw:image':
      return [pictureOf(scope, node)]
    case 'draw:frame':
      return frame(scope, node, depth)
    default:
      return inner(scope, node, depth)
  }
}

const odfNode = (scope: Scope, node: Node, depth: number): Child[] => {
  if (node.nodeType === Node.TEXT_NODE) return [node.textContent ?? '']
  if (!(node instanceof Element) || SKIPPED.has(qualified(node))) return []
  if (depth > MAX_DEPTH) return [node.textContent ?? '']
  return elementNode(scope, node, depth)
}

const inner = (scope: Scope, node: Element, depth: number): Child[] => [...node.childNodes].flatMap(child => odfNode(scope, child, depth + 1))

const odfBody = (scope: Scope, root: Element) => inner(scope, root, 0)

export { imagePaths, odfBody, repeat, type Scope }
