import { oneLine, timestamp } from '@sand/util'
import { z } from 'zod'
import type { Entry } from './entry'
import type { Block, Message } from './message'
import { textOf } from './prompt/text'

export const historyViews = ['messages', 'activity'] as const

const mostItems = 200
const defaultLimit = 50
const callLimit = 500
const resultLimit = 2_000
const itemChars = 8_000

export const historyReading = z.object({
  query: z.string().min(1).optional().describe('Only items whose text holds this, ignoring case'),
  view: z.enum(historyViews).optional().describe('messages (default): what was said, notifications included; activity: tool calls and results too'),
  after: z.number().int().min(0).optional().describe('Return the items after this seq, oldest first'),
  before: z.number().int().min(1).optional().describe('Return the items before this seq; without after, the newest of them'),
  limit: z.number().int().min(1).max(mostItems).optional().describe(`At most this many items (default ${defaultLimit})`),
})

export type HistoryReading = z.infer<typeof historyReading>

export const historyItem = z.object({
  item: z.string().min(1).optional().describe('Read one item in full instead of a page: its seq, or an item id from a [Historical …] header'),
  offset: z.number().int().min(0).optional().describe('Where to go on reading the item: the nextOffset it returned'),
})

export interface HistoryItem {
  seq: number
  at: string
  role: Message['role']
  text: string
  turn?: string
}

export interface HistoryPage {
  items: HistoryItem[]
  more: boolean
}

export interface HistoryItemPage {
  item: string
  seq: number
  at: string
  role: Message['role']
  text: string
  nextOffset?: number
}

export type HistoryEntry = Pick<Entry, 'id' | 'seq' | 'at' | 'type' | 'data' | 'turn'>

type Said = HistoryEntry & { data: Message }

const clip = (text: string) => (text.length > resultLimit ? `${text.slice(0, resultLimit)}… ${text.length - resultLimit} more characters` : text)

const isSaid = (entry: HistoryEntry): entry is Said => entry.type === 'message'

const namesOf = (said: Said[]) =>
  new Map(said.flatMap(({ data }) => data.content.flatMap(block => (block.type === 'tool_call' ? [[block.id, block.name] as const] : []))))

const activity = (names: Map<string, string>, full = false) => (block: Block) => {
  if (block.type === 'text') return block.text
  if (block.type === 'tool_call') return `[${block.name}] ${full ? JSON.stringify(block.input) : oneLine(JSON.stringify(block.input), callLimit)}`
  if (block.type === 'tool_result') return `[${names.get(block.callId) ?? 'tool'} result${block.isError ? ', error' : ''}] ${full ? textOf(block.content) : clip(textOf(block.content))}`
  return ''
}

const reader = (view: HistoryReading['view'], said: Said[]): ((message: Message) => string) => {
  if (view !== 'activity') return message => textOf(message.content)
  const text = activity(namesOf(said))
  return message => message.content.map(text).filter(Boolean).join('\n')
}

const itemOf =
  (read: (message: Message) => string) =>
  ({ seq, at, data, turn }: Said): HistoryItem[] => {
    const text = read(data).trim()
    return text ? [{ seq, at: timestamp(at), role: data.role, text, ...(turn && { turn }) }] : []
  }

export const readHistory = (entries: HistoryEntry[], { query, view, after, before = Infinity, limit = defaultLimit }: HistoryReading): HistoryPage => {
  const said = entries.filter(isSaid)
  const needle = query?.toLowerCase()
  const found = said
    .filter(entry => entry.seq > (after ?? 0) && entry.seq < before)
    .flatMap(itemOf(reader(view, said)))
    .filter(item => !needle || item.text.toLowerCase().includes(needle))
  const items = after === undefined ? found.slice(-limit) : found.slice(0, limit)
  return { items, more: found.length > items.length }
}

const blocksOf = (said: Said[], entry: Said, call: string | undefined) =>
  call
    ? said.flatMap(({ data }) => data.content.filter(block => (block.type === 'tool_call' && block.id === call) || (block.type === 'tool_result' && block.callId === call)))
    : entry.data.content

export const readItem = (entries: HistoryEntry[], item: string, offset = 0): HistoryItemPage => {
  const said = entries.filter(isSaid)
  const [id = '', call] = item.split('#')
  const entry = said.find(found => (/^\d+$/.test(id) ? found.seq === Number(id) : found.id === id))
  const text = entry ? blocksOf(said, entry, call).map(activity(namesOf(said), true)).filter(Boolean).join('\n') : ''
  if (!entry || !text) throw new Error(`No item ${item}`)
  const end = offset + itemChars
  return { item, seq: entry.seq, at: timestamp(entry.at), role: entry.data.role, text: text.slice(offset, end), ...(end < text.length && { nextOffset: end }) }
}
