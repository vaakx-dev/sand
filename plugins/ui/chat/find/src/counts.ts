import { type Entry, type Message, searchableText, type SearchableBlock } from '@sand/chats/contract'
import { textMatches } from '@sand/util'
import type { FoundBlock } from './contract'

const searchable = new WeakMap<Entry, SearchableBlock[]>()

const textBlocks = (entry: Entry) => {
  const known = searchable.get(entry)
  if (known) return known
  const blocks = entry.type === 'message' ? searchableText(entry.data as Message) : []
  searchable.set(entry, blocks)
  return blocks
}

const blockCounts = (entries: Entry[], query: string): FoundBlock[] =>
  entries
    .flatMap(entry => textBlocks(entry).map(({ block, text }) => ({ entry: entry.id, block, count: textMatches(text, query).length })))
    .filter(found => found.count > 0)

export { blockCounts, textBlocks }
