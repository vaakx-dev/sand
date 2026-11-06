import type { ContextRecord, ModelContent, UserContent } from '../message'
import { isModelContent } from './content'

export interface ContextLink {
  start: number
  end: number
  kind: string
  id: string
  label: string
}

export type TextPiece = string | ContextLink

export type ContextProjection = { body: string } | { unavailable: string }

export interface ContextProjector {
  title: string
  project(record: ContextRecord): ContextProjection | Promise<ContextProjection>
}

const scheme = 'sand-context://v1/'
const kindGrammar = '[a-z][a-z0-9-]{0,39}'
const idGrammar = '[a-z0-9_-]{1,128}'
const labelLimit = 200
const fallbackLabel = 'context'
const missing: ContextProjection = { unavailable: 'Nothing is attached for this link.' }

const kindPattern = new RegExp(`^${kindGrammar}$`)
const idPattern = new RegExp(`^${idGrammar}$`)
const linkPattern = new RegExp(`\\[([^\\[\\]\\r\\n]{1,${labelLimit}})\\]\\(sand-context://v1/(${kindGrammar})/(${idGrammar})\\)`, 'gu')
const tagOpener = /<(?=\/?(?:context|record)\b)/gi
const refAssignment = /(;\s*ref)=/gi

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

export const textPieces = (text: string): TextPiece[] => {
  const pieces: TextPiece[] = []
  let at = 0
  for (const link of contextLinks(text)) {
    pieces.push(text.slice(at, link.start), link)
    at = link.end
  }
  pieces.push(text.slice(at))
  return pieces
}

export const isContextLink = (piece: TextPiece): piece is ContextLink => typeof piece !== 'string'

const keyOf = ({ kind, id }: Pick<ContextRecord, 'kind' | 'id'>) => `${kind}/${id}`

const firstLinks = (links: ContextLink[]) => {
  const first = new Map<string, ContextLink>()
  for (const link of links) if (!first.has(keyOf(link))) first.set(keyOf(link), link)
  return [...first.values()]
}

export const linkedRecords = (text: string, records: ContextRecord[]) => {
  const byKey = new Map(records.map(record => [keyOf(record), record]))
  return firstLinks(contextLinks(text)).flatMap(link => byKey.get(keyOf(link)) ?? [])
}

const escapeTags = (text: string) => text.replace(tagOpener, '&lt;')

const escapeTyped = (text: string) => escapeTags(text).replace(refAssignment, '$1\\=')

const withMarkers = (pieces: TextPiece[], titleOf: (kind: string) => string) =>
  pieces.map(piece => (isContextLink(piece) ? `[${titleOf(piece.kind)}: ${escapeTyped(piece.label)}; ref=${piece.id}]` : escapeTyped(piece))).join('')

const project = async (record: ContextRecord | undefined, projector: ContextProjector | undefined): Promise<ContextProjection> => {
  if (!record) return missing
  return projector ? projector.project(record) : { body: JSON.stringify(record.data, null, 2) }
}

const entry = ({ kind, id }: ContextLink, projection: ContextProjection) =>
  'body' in projection
    ? `<record kind="${kind}" id="${id}">\n${escapeTags(projection.body)}\n</record>`
    : `<record kind="${kind}" id="${id}" unavailable="true">\n${escapeTags(projection.unavailable)}\n</record>`

export const projectContext = async (content: UserContent[], projectorOf: (kind: string) => ContextProjector | undefined): Promise<UserContent[]> => {
  const typed = content.filter(isModelContent)
  const parsed = typed.map(block => ({ block, pieces: block.type === 'text' ? textPieces(block.text) : [] }))
  const links = firstLinks(parsed.flatMap(({ pieces }) => pieces.filter(isContextLink)))
  if (!links.length) return typed
  const records = new Map(content.flatMap(block => (block.type === 'context' ? block.records : [])).map(record => [keyOf(record), record]))
  const entries = await Promise.all(links.map(async link => entry(link, await project(records.get(keyOf(link)), projectorOf(link.kind)))))
  const titleOf = (kind: string) => projectorOf(kind)?.title ?? kind
  const marked = parsed.map(({ block, pieces }): ModelContent =>
    block.type === 'text' && pieces.some(isContextLink) ? { type: 'text', text: withMarkers(pieces, titleOf), typed: block.text } : block,
  )
  const envelope = ['<context version="1">', ...entries, '</context>'].join('\n')
  const linked = links.flatMap(link => records.get(keyOf(link)) ?? [])
  return [...marked, { type: 'text', text: envelope, typed: '' }, { type: 'context', records: linked }]
}
