import type { Block, ContextRecord, UserContent } from '../message'

export interface ContextLink {
  start: number
  end: number
  kind: string
  id: string
  label: string
}

export interface ContextProjector {
  title: string
  project(record: ContextRecord): string | undefined | Promise<string | undefined>
}

interface Projection {
  link: ContextLink
  title: string
  record?: ContextRecord
  body?: string
}

const scheme = 'sand-context://v1/'
const kindGrammar = '[a-z][a-z0-9-]{0,39}'
const idGrammar = '[a-z0-9_-]{1,128}'
const labelLimit = 200
const fallbackLabel = 'context'
const envelopeOpen = '<context version="1">\n'
const envelopeClose = '\n</context>'
const tagAhead = '(?=/?(?:context|record)\\b)'

const kindPattern = new RegExp(`^${kindGrammar}$`)
const idPattern = new RegExp(`^${idGrammar}$`)
const linkPattern = new RegExp(`\\[([^\\[\\]\\r\\n]{1,${labelLimit}})\\]\\(sand-context://v1/(${kindGrammar})/(${idGrammar})\\)`, 'gu')
const markerPattern = new RegExp(`\\[[^\\[\\]\\r\\n:]+: ([^\\[\\]\\r\\n]+); ref=(${idGrammar})\\]`, 'gu')
const entryPattern = new RegExp(`^<record kind="(${kindGrammar})" id="(${idGrammar})"`, 'gm')
const openerPattern = new RegExp(`(?:<|&(?:amp;)*lt;)${tagAhead}`, 'gi')
const escapedPattern = new RegExp(`&(?:amp;)*lt;${tagAhead}`, 'gi')

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const isContextRecord = (value: unknown): value is ContextRecord =>
  isObject(value) &&
  value.v === 1 &&
  typeof value.id === 'string' &&
  idPattern.test(value.id) &&
  typeof value.kind === 'string' &&
  kindPattern.test(value.kind) &&
  typeof value.label === 'string' &&
  isObject(value.data)

export const contextLabel = (label: string) => {
  const flat = label.replaceAll('[', '(').replaceAll(']', ')').replace(/\s+/g, ' ').trim()
  const cut = [...flat].slice(0, labelLimit).join('').replace(/[\s\\]+$/, '')
  return cut || fallbackLabel
}

export const contextLink = ({ kind, id, label }: Pick<ContextRecord, 'kind' | 'id' | 'label'>) => `[${contextLabel(label)}](${scheme}${kind}/${id})`

export const contextLinks = (text: string): ContextLink[] =>
  [...text.matchAll(linkPattern)].flatMap(({ 0: link, 1: label, 2: kind, 3: id, index }) =>
    contextLabel(label!) === label ? [{ start: index, end: index + link.length, kind: kind!, id: id!, label }] : [],
  )

const escapeTags = (text: string) => text.replace(openerPattern, opener => (opener === '<' ? '&lt;' : `&amp;${opener.slice(1)}`))

const unescapeTags = (text: string) => text.replace(escapedPattern, opener => (opener.length === 4 ? '<' : `&${opener.slice(5)}`))

const firstLinks = (links: ContextLink[]) => {
  const first = new Map<string, ContextLink>()
  for (const link of links) if (!first.has(link.id)) first.set(link.id, link)
  return [...first.values()]
}

const project = async (link: ContextLink, record: ContextRecord | undefined, projectorOf: (kind: string) => ContextProjector | undefined): Promise<Projection> => {
  const projector = projectorOf(link.kind)
  const title = projector?.title ?? link.kind
  if (!record || record.kind !== link.kind) return { link, title }
  const body = projector ? await projector.project(record) : JSON.stringify(record.data, null, 2)
  return body === undefined ? { link, title } : { link, title, record, body }
}

const marker = (link: ContextLink, title: string) => `[${title}: ${escapeTags(link.label)}; ref=${link.id}]`

const withMarkers = (text: string, titles: Map<string, string>) =>
  contextLinks(text).reduceRight((out, link) => out.slice(0, link.start) + marker(link, titles.get(link.id)!) + out.slice(link.end), text)

const entry = ({ link, body }: Projection) => {
  const open = `<record kind="${link.kind}" id="${link.id}"`
  return body === undefined ? `${open} unavailable="true"/>` : `${open}>\n${escapeTags(body)}\n</record>`
}

const envelope = (projections: Projection[]) => `${envelopeOpen}${projections.map(entry).join('\n')}${envelopeClose}`

export const projectContext = async (content: UserContent[], projectorOf: (kind: string) => ContextProjector | undefined): Promise<UserContent[]> => {
  const links = content.flatMap(block => (block.type === 'text' ? contextLinks(block.text) : []))
  if (!links.length) return content
  const records = new Map(content.flatMap(block => (block.type === 'context' ? block.records : [])).map(record => [record.id, record]))
  const projections = await Promise.all(firstLinks(links).map(link => project(link, records.get(link.id), projectorOf)))
  const titles = new Map(projections.map(({ link, title }) => [link.id, title]))
  const projected = content.flatMap((block): UserContent[] => {
    if (block.type === 'context') return []
    return block.type === 'text' ? [{ type: 'text', text: withMarkers(block.text, titles) }] : [block]
  })
  const kept = projections.flatMap(({ record }) => record ?? [])
  return [...projected, { type: 'text', text: envelope(projections) }, { type: 'context', records: kept }]
}

export const isContextEnvelope = (block: Block, next?: Block) =>
  block.type === 'text' && next?.type === 'context' && block.text.startsWith(envelopeOpen) && block.text.endsWith(envelopeClose)

const referencedKinds = (content: Block[]) =>
  new Map(
    content.flatMap((block, index) =>
      block.type === 'text' && isContextEnvelope(block, content[index + 1]) ? [...block.text.matchAll(entryPattern)].map(([, kind, id]) => [id!, kind!] as const) : [],
    ),
  )

export const restoreLinks = (text: string, content: Block[]) => {
  const kinds = referencedKinds(content)
  return text.replace(markerPattern, (marker, label: string, id: string) => {
    const kind = kinds.get(id)
    return kind ? `[${unescapeTags(label)}](${scheme}${kind}/${id})` : marker
  })
}
