import type { Archive } from '../archive'
import { imageType, viewable } from '../image'
import { child, children, mainPart, numberAttribute, partXml, path, relatedOfType, relationId, type Relationship, relationships } from '../xml'
import { bulletOf, numbering } from './bullet'

type TextAlign = 'left' | 'center' | 'right' | 'justify'

type Anchor = 'top' | 'middle' | 'bottom'

interface Frame {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

interface Run {
  text: string
  size: number
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  font?: string
  lineBreak: boolean
}

interface Paragraph {
  runs: Run[]
  size: number
  align: TextAlign
  bullet?: string
  margin: number
  indent: number
  spaceBefore: number
  spaceAfter: number
  lineHeight: number
}

interface Insets {
  left: number
  top: number
  right: number
  bottom: number
}

interface TableCell {
  paragraphs: Paragraph[]
  columnSpan: number
  rowSpan: number
}

type Shape =
  | { kind: 'text'; frame: Frame; paragraphs: Paragraph[]; anchor: Anchor; insets: Insets; wrap: boolean }
  | { kind: 'picture'; frame: Frame; image: Blob; alt: string }
  | { kind: 'table'; frame: Frame; columns: number[]; rows: TableCell[][] }

interface Slide {
  shapes: Shape[]
}

interface Source {
  root: Element
  related: Map<string, Relationship>
}

interface Fonts {
  major: string
  minor: string
}

interface Placement {
  archive: Archive
  layout?: Source
  master?: Source
  fonts: Fonts
}

interface TextContext {
  levels: (level: number) => Element[]
  bodies: Element[]
  fonts: Fonts
}

const EMU_PER_POINT = 12_700
const DEFAULT_SIZE = { width: 9_144_000, height: 6_858_000 }
const DEFAULT_POINTS = 18
const DEFAULT_INSETS: Insets = { left: 91_440, top: 45_720, right: 91_440, bottom: 45_720 }
const SINGLE_LINE = 1.2
const PERCENT = 100_000
const DEGREE = 60_000

const ALIGNS: Record<string, TextAlign> = { l: 'left', ctr: 'center', r: 'right', just: 'justify', dist: 'justify' }
const ANCHORS: Record<string, Anchor> = { t: 'top', ctr: 'middle', b: 'bottom' }
const CATEGORIES: Record<string, string> = { title: 'title', ctrTitle: 'title', subTitle: 'body', obj: 'body' }

const firstValue = <T>(nodes: (Element | undefined)[], read: (node: Element) => T | undefined) => {
  for (const node of nodes) {
    const value = node ? read(node) : undefined
    if (value !== undefined) return value
  }
  return undefined
}

const flagOf = (name: string) => (node: Element) => {
  const value = node.getAttribute(name)
  return value === null ? undefined : value === '1' || value === 'true'
}

const childrenOf = (node: Element | undefined) => [...(node?.children ?? [])]

const sourceOf = async (archive: Archive, part: string): Promise<Source> => {
  const [root, related] = await Promise.all([partXml(archive, part), relationships(archive, part)])
  return { root, related }
}

const placeholderOf = (shape: Element) => child(child(shape.firstElementChild ?? undefined, 'nvPr'), 'ph')

const categoryOf = (placeholder: Element) => {
  const type = placeholder.getAttribute('type') ?? 'obj'
  return CATEGORIES[type] ?? type
}

const treeOf = (source: Source | undefined) => path(source?.root, 'cSld', 'spTree')

const matchIn = (source: Source | undefined, placeholder: Element) => {
  const shapes = childrenOf(treeOf(source)).filter(shape => placeholderOf(shape))
  const index = placeholder.getAttribute('idx')
  const byIndex = index === null ? undefined : shapes.find(shape => placeholderOf(shape)?.getAttribute('idx') === index)
  return byIndex ?? shapes.find(shape => categoryOf(placeholderOf(shape)!) === categoryOf(placeholder))
}

const inherited = (placement: Placement, shape: Element) => {
  const placeholder = placeholderOf(shape)
  if (!placeholder) return []
  const fromLayout = matchIn(placement.layout, placeholder)
  const fromMaster = matchIn(placement.master, fromLayout ? (placeholderOf(fromLayout) ?? placeholder) : placeholder)
  return [fromLayout, fromMaster].filter(found => found !== undefined)
}

const ownFrame = (shape: Element): Frame | undefined => {
  const transform = child(child(shape, 'spPr'), 'xfrm') ?? child(shape, 'xfrm') ?? child(child(shape, 'grpSpPr'), 'xfrm')
  const offset = child(transform, 'off')
  const extent = child(transform, 'ext')
  if (!offset || !extent) return undefined
  return {
    x: numberAttribute(offset, 'x') ?? 0,
    y: numberAttribute(offset, 'y') ?? 0,
    width: numberAttribute(extent, 'cx') ?? 0,
    height: numberAttribute(extent, 'cy') ?? 0,
    rotation: (numberAttribute(transform, 'rot') ?? 0) / DEGREE,
  }
}

const frameOf = (shape: Element, chain: Element[]) => firstValue([shape, ...chain], ownFrame)

const groupPlace = (group: Element, outer: (frame: Frame) => Frame) => {
  const transform = child(child(group, 'grpSpPr'), 'xfrm')
  const own = ownFrame(group)
  const childOffset = child(transform, 'chOff')
  const childExtent = child(transform, 'chExt')
  if (!own || !childOffset || !childExtent) return outer
  const origin = { x: numberAttribute(childOffset, 'x') ?? 0, y: numberAttribute(childOffset, 'y') ?? 0 }
  const scaleX = own.width / (numberAttribute(childExtent, 'cx') || own.width || 1)
  const scaleY = own.height / (numberAttribute(childExtent, 'cy') || own.height || 1)
  return (frame: Frame) =>
    outer({
      x: own.x + (frame.x - origin.x) * scaleX,
      y: own.y + (frame.y - origin.y) * scaleY,
      width: frame.width * scaleX,
      height: frame.height * scaleY,
      rotation: frame.rotation,
    })
}

const typeface = (fonts: Fonts) => (node: Element) => {
  const name = child(node, 'latin')?.getAttribute('typeface') ?? undefined
  if (!name) return undefined
  if (name.startsWith('+mj')) return fonts.major || undefined
  if (name.startsWith('+mn')) return fonts.minor || undefined
  return name
}

const pointsOf = (node: Element) => {
  const size = numberAttribute(node, 'sz')
  return size === undefined ? undefined : size / 100
}

const spacing = (name: string, size: number) => (node: Element) => {
  const found = child(node, name)
  const points = numberAttribute(child(found, 'spcPts'), 'val')
  if (points !== undefined) return points / 100
  const percent = numberAttribute(child(found, 'spcPct'), 'val')
  return percent === undefined ? undefined : (percent / PERCENT) * size
}

const lineHeightOf = (node: Element, size: number) => {
  const line = child(node, 'lnSpc')
  const points = numberAttribute(child(line, 'spcPts'), 'val')
  if (points !== undefined) return points / 100 / size
  const percent = numberAttribute(child(line, 'spcPct'), 'val')
  return percent === undefined ? undefined : (percent / PERCENT) * SINGLE_LINE
}

const runOf = (run: Element, runChain: Element[], context: TextContext, scale: number): Run => {
  const chain = [child(run, 'rPr'), ...runChain]
  const underline = firstValue(chain, node => node.getAttribute('u') ?? undefined)
  const strike = firstValue(chain, node => node.getAttribute('strike') ?? undefined)
  return {
    text: run.localName === 'br' ? '' : (child(run, 't')?.textContent ?? ''),
    size: (firstValue(chain, pointsOf) ?? DEFAULT_POINTS) * scale,
    bold: firstValue(chain, flagOf('b')) ?? false,
    italic: firstValue(chain, flagOf('i')) ?? false,
    underline: underline !== undefined && underline !== 'none',
    strike: strike !== undefined && strike !== 'noStrike',
    font: firstValue(chain, typeface(context.fonts)),
    lineBreak: run.localName === 'br',
  }
}

const scaleOf = (bodies: Element[]) => {
  const fit = child(bodies[0], 'normAutofit')
  return { font: (numberAttribute(fit, 'fontScale') ?? PERCENT) / PERCENT, lines: 1 - (numberAttribute(fit, 'lnSpcReduction') ?? 0) / PERCENT }
}

const paragraphsOf = (body: Element | undefined, context: TextContext) => {
  const scale = scaleOf(context.bodies)
  const counter = numbering()
  return children(body, 'p').map((paragraph): Paragraph => {
    const own = child(paragraph, 'pPr')
    const level = (numberAttribute(own, 'lvl') ?? 0) + 1
    const chain = [own, ...context.levels(level)]
    const runChain = chain.flatMap(node => child(node, 'defRPr') ?? [])
    const runs = [...paragraph.children].filter(node => ['r', 'br', 'fld'].includes(node.localName)).map(run => runOf(run, runChain, context, scale.font))
    const size = runs[0]?.size ?? (firstValue([child(paragraph, 'endParaRPr'), ...runChain], pointsOf) ?? DEFAULT_POINTS) * scale.font
    const bullet = runs.some(run => run.text.trim()) ? firstValue(chain, bulletOf) : undefined
    return {
      runs,
      size,
      align: ALIGNS[firstValue(chain, node => node.getAttribute('algn') ?? undefined) ?? ''] ?? 'left',
      bullet: counter.label(level, bullet),
      margin: firstValue(chain, node => numberAttribute(node, 'marL')) ?? 0,
      indent: firstValue(chain, node => numberAttribute(node, 'indent')) ?? 0,
      spaceBefore: firstValue(chain, spacing('spcBef', size)) ?? 0,
      spaceAfter: firstValue(chain, spacing('spcAft', size)) ?? 0,
      lineHeight: (firstValue(chain, node => lineHeightOf(node, size)) ?? SINGLE_LINE) * scale.lines,
    }
  })
}

const levelsOf = (owners: (Element | undefined)[], style: Element | undefined) => (level: number) =>
  [...owners.map(owner => path(owner, 'txBody', 'lstStyle')), style].flatMap(list => child(list, `lvl${level}pPr`) ?? [])

const masterStyle = (placement: Placement, shape: Element) => {
  const styles = path(placement.master?.root, 'txStyles')
  const placeholder = placeholderOf(shape)
  if (!placeholder) return child(styles, 'otherStyle')
  return child(styles, categoryOf(placeholder) === 'title' ? 'titleStyle' : 'bodyStyle')
}

const insetsOf = (bodies: Element[]): Insets => ({
  left: firstValue(bodies, node => numberAttribute(node, 'lIns')) ?? DEFAULT_INSETS.left,
  top: firstValue(bodies, node => numberAttribute(node, 'tIns')) ?? DEFAULT_INSETS.top,
  right: firstValue(bodies, node => numberAttribute(node, 'rIns')) ?? DEFAULT_INSETS.right,
  bottom: firstValue(bodies, node => numberAttribute(node, 'bIns')) ?? DEFAULT_INSETS.bottom,
})

const textShape = (shape: Element, place: (frame: Frame) => Frame, placement: Placement): Shape[] => {
  const body = child(shape, 'txBody')
  if (!body?.textContent?.trim()) return []
  const chain = inherited(placement, shape)
  const frame = frameOf(shape, chain)
  if (!frame) return []
  const bodies = [body, ...chain.map(found => child(found, 'txBody'))].flatMap(found => child(found, 'bodyPr') ?? [])
  const context = { levels: levelsOf([shape, ...chain], masterStyle(placement, shape)), bodies, fonts: placement.fonts }
  return [
    {
      kind: 'text',
      frame: place(frame),
      paragraphs: paragraphsOf(body, context),
      anchor: ANCHORS[firstValue(bodies, node => node.getAttribute('anchor') ?? undefined) ?? ''] ?? 'top',
      insets: insetsOf(bodies),
      wrap: firstValue(bodies, node => node.getAttribute('wrap') ?? undefined) !== 'none',
    },
  ]
}

const pictureShape = async (shape: Element, place: (frame: Frame) => Frame, placement: Placement, source: Source): Promise<Shape[]> => {
  const target = source.related.get(relationId(path(shape, 'blipFill', 'blip'), 'embed') ?? '')
  const frame = frameOf(shape, inherited(placement, shape))
  const type = target && imageType(target.target)
  if (!target || !frame || !type) return []
  const bytes = await placement.archive.bytes(target.target)
  if (!viewable(bytes, type)) return []
  const alt = child(shape.firstElementChild ?? undefined, 'cNvPr')?.getAttribute('descr') ?? ''
  return [{ kind: 'picture', frame: place(frame), image: new Blob([bytes.slice()], { type }), alt }]
}

const tableCells = (table: Element, placement: Placement) => {
  const style = child(path(placement.master?.root, 'txStyles'), 'otherStyle')
  return children(table, 'tr').map(row =>
    children(row, 'tc')
      .filter(cell => !flagOf('hMerge')(cell) && !flagOf('vMerge')(cell))
      .map(cell => {
        const body = child(cell, 'txBody')
        const context = { levels: levelsOf([cell], style), bodies: [], fonts: placement.fonts }
        return { paragraphs: paragraphsOf(body, context), columnSpan: numberAttribute(cell, 'gridSpan') ?? 1, rowSpan: numberAttribute(cell, 'rowSpan') ?? 1 }
      }),
  )
}

const tableShape = (shape: Element, place: (frame: Frame) => Frame, placement: Placement): Shape[] => {
  const table = path(shape, 'graphic', 'graphicData', 'tbl')
  const frame = ownFrame(shape)
  if (!table || !frame) return []
  const columns = children(child(table, 'tblGrid'), 'gridCol').map(column => numberAttribute(column, 'w') ?? 0)
  return [{ kind: 'table', frame: place(frame), columns, rows: tableCells(table, placement) }]
}

const alternative = (node: Element) => {
  const fallback = child(node, 'Fallback')
  return fallback?.firstElementChild ? fallback : child(node, 'Choice')
}

const shapeOf = (node: Element, place: (frame: Frame) => Frame, placement: Placement, source: Source): Shape[] | Promise<Shape[]> => {
  switch (node.localName) {
    case 'sp':
      return textShape(node, place, placement)
    case 'pic':
      return pictureShape(node, place, placement, source)
    case 'graphicFrame':
      return tableShape(node, place, placement)
    case 'grpSp':
      return shapesIn(childrenOf(node), groupPlace(node, place), placement, source)
    case 'AlternateContent':
      return shapesIn(childrenOf(alternative(node)), place, placement, source)
    default:
      return []
  }
}

const shapesIn = async (nodes: Element[], place: (frame: Frame) => Frame, placement: Placement, source: Source): Promise<Shape[]> =>
  (await Promise.all(nodes.map(node => shapeOf(node, place, placement, source)))).flat()

const unmoved = (frame: Frame) => frame

const decorationsOf = async (source: Source | undefined, placement: Placement) =>
  source ? shapesIn(childrenOf(treeOf(source)).filter(shape => !placeholderOf(shape)), unmoved, placement, source) : []

const shown = (source: Source | undefined) => source?.root.getAttribute('showMasterSp') !== '0'

const fontsOf = async (archive: Archive, master: Source | undefined): Promise<Fonts> => {
  const theme = relatedOfType(master?.related ?? new Map(), 'theme')
  if (!theme || !archive.has(theme)) return { major: '', minor: '' }
  const scheme = path(await partXml(archive, theme), 'themeElements', 'fontScheme')
  return {
    major: path(scheme, 'majorFont', 'latin')?.getAttribute('typeface') ?? '',
    minor: path(scheme, 'minorFont', 'latin')?.getAttribute('typeface') ?? '',
  }
}

const relatedSource = async (archive: Archive, source: Source, type: string) => {
  const part = relatedOfType(source.related, type)
  return part && archive.has(part) ? sourceOf(archive, part) : undefined
}

const slideOf = async (archive: Archive, part: string): Promise<Slide> => {
  const slide = await sourceOf(archive, part)
  const layout = await relatedSource(archive, slide, 'slideLayout')
  const master = layout ? await relatedSource(archive, layout, 'slideMaster') : undefined
  const placement: Placement = { archive, layout, master, fonts: await fontsOf(archive, master) }
  const layers = await Promise.all([
    shown(slide) && shown(layout) ? decorationsOf(master, placement) : [],
    shown(slide) ? decorationsOf(layout, placement) : [],
    shapesIn(childrenOf(treeOf(slide)), unmoved, placement, slide),
  ])
  return { shapes: layers.flat() }
}

const deckOf = async (archive: Archive) => {
  const part = (await mainPart(archive)) ?? 'ppt/presentation.xml'
  const [root, related] = await Promise.all([partXml(archive, part), relationships(archive, part)])
  const size = child(root, 'sldSz')
  const slides = children(child(root, 'sldIdLst'), 'sldId').flatMap(entry => {
    const target = related.get(relationId(entry) ?? '')
    return target?.type === 'slide' && archive.has(target.target) ? [target.target] : []
  })
  const read = new Map<number, Promise<Slide>>()
  const slide = (index: number) => read.get(index) ?? read.set(index, slideOf(archive, slides[index]!)).get(index)!
  return {
    width: numberAttribute(size, 'cx') ?? DEFAULT_SIZE.width,
    height: numberAttribute(size, 'cy') ?? DEFAULT_SIZE.height,
    count: slides.length,
    slide,
  }
}

type Deck = Awaited<ReturnType<typeof deckOf>>

export { deckOf, EMU_PER_POINT, type Anchor, type Deck, type Frame, type Paragraph, type Run, type Shape, type Slide, type TableCell, type TextAlign }
