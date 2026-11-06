import type { Tool } from '@sand/tools/contract'
import type { ProviderThreadInfo } from '../contract'
import { z } from 'zod'
import type { ThreadsContext } from '../context'
import { type Item, itemsOf } from '../handoff/items'
import { clip, fullText } from '../handoff/render'
import { currentPath, madeBy } from '../current'

const input = z.object({
  item: z.string().optional().describe('An item id from a [Historical …] header, to read that item in full'),
  after: z.number().int().optional().describe('List the items after this seq'),
  limit: z.number().int().min(1).max(50).default(20),
  maxChars: z.number().int().min(500).max(8_000).default(4_000).describe('Characters per item'),
  offset: z.number().int().min(0).default(0).describe('Where to continue reading one item, from its nextOffset'),
})

const readItem = (items: Item[], id: string, offset: number, maxChars: number) => {
  const found = items.find(item => item.id === id)
  if (!found) throw new Error(`This chat has no item ${id}`)
  const text = fullText(found)
  const page = text.slice(offset, offset + maxChars)
  return offset + maxChars < text.length ? `${page}\n\nnextOffset: ${offset + maxChars}` : page
}

const listItems = (items: Item[], after: number, limit: number, maxChars: number) => {
  const following = items.filter(item => item.seq > after)
  const end = following.findIndex((item, at) => at >= limit && item.seq !== following[at - 1]!.seq)
  const page = end < 0 ? following : following.slice(0, end)
  const text = page.map(item => clip(fullText(item), maxChars, item.id)).join('\n\n') || 'No items after that.'
  return end < 0 ? text : `${text}\n\nnextAfter: ${page.at(-1)!.seq}`
}

export const threadReadName = 'thread_read'

export const readsHistory = ({ seen: [first] }: ProviderThreadInfo) => !!first && 'handoff' in first

export const threadRead = (ctx: ThreadsContext): Tool<typeof input> => ({
  name: threadReadName,
  description:
    'Read earlier items of this chat that a context handoff left out or shortened. Pass item to read one item in full, or after to list the items that follow a seq.',
  input,
  parallel: true,
  active: conversation => conversation.path().some(entry => entry.type === 'handoff'),
  run({ item, after, limit, maxChars, offset }, { conversation }) {
    const path = currentPath(ctx, conversation)
    const items = itemsOf(path, path.entries, madeBy(ctx, path, conversation.owner))
    return item ? readItem(items, item, offset, maxChars) : listItems(items, after ?? -1, limit, maxChars)
  },
})
