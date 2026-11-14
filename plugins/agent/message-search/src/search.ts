import { searchWords } from '@sand/util'
import { type ChatOwner, type Fit, fits, type MessageHit } from './contract'
import { excerptOf } from './excerpt'
import { chatText, fitMatch, type Scope, scopedMatch } from './match'
import { type Block, firstSlot, type Store, timeOf } from './store'

export interface Search {
  query: string
  owner?: ChatOwner
  chat?: string
  before?: number
  limit?: number
}

export interface Chats {
  tracks(owner: ChatOwner): boolean
  title(owner: ChatOwner, id: string): string | undefined
}

interface Found {
  block: Block
  fit: Fit
  title: string
}

const DEFAULT_LIMIT = 20
const PER_CHAT = 3
const FIRST_PAGE_PER_HIT = 2
const NEWEST_MATCHES = 2000

const tiers = (words: string[]) =>
  fits
    .map(fit => ({ fit, words: fitMatch(fit, words) }))
    .filter((tier, index, all) => all.findIndex(other => other.words === tier.words) === index)

const searchMessages = (store: Store, chats: Chats, { query, owner, chat, before, limit = DEFAULT_LIMIT }: Search): MessageHit[] => {
  const words = searchWords(query)
  if (!words.length || (owner && !chats.tracks(owner))) return []
  const perChat = chat ? Infinity : PER_CHAT
  const scope: Scope = { owner, chat, skipped: [] }
  const titles = new Map<string, string | undefined>()
  const counts = new Map<string, number>()
  const seen = new Set<number>()
  const found: Found[] = []

  const titleOf = ({ owner, chat }: Block) => {
    const key = chatText(owner, chat)
    if (!titles.has(key)) titles.set(key, chats.title(owner, chat))
    const title = titles.get(key)
    if (title === undefined) store.drop(owner, chat)
    return title
  }

  const take = (block: Block, fit: Fit) => {
    if (found.length >= limit || seen.has(block.rowid) || !chats.tracks(block.owner)) return
    seen.add(block.rowid)
    const key = chatText(block.owner, block.chat)
    const count = counts.get(key) ?? 0
    if (count >= perChat) return
    const title = titleOf(block)
    if (title === undefined) return
    counts.set(key, count + 1)
    if (count + 1 >= perChat) scope.skipped.push(key)
    found.push({ block, fit, title })
  }

  const newest = before === undefined ? Number.MAX_SAFE_INTEGER : firstSlot(before)
  const from = store.oldestOfNewest({ match: scopedMatch(fitMatch('prefixes', words), scope), below: newest, most: NEWEST_MATCHES })

  const scan = (fit: Fit, tierWords: string) => {
    let below = newest
    for (let most = limit * FIRST_PAGE_PER_HIT; found.length < limit; most *= 2) {
      const page = store.matching({ match: scopedMatch(tierWords, scope), from, below, most })
      for (const block of page) take(block, fit)
      if (page.length < most) return
      below = page.at(-1)!.rowid
    }
  }

  const hitOf = ({ block, fit, title }: Found): MessageHit[] => {
    const text = store.text(block)
    if (text === undefined) return []
    const { owner, chat, entry, role, rowid } = block
    return [{ owner, chat, title, entry, block: block.block, role, at: timeOf(rowid), fit, excerpt: excerptOf(text, words) }]
  }

  for (const tier of tiers(words)) scan(tier.fit, tier.words)
  return found.flatMap(hitOf)
}

export { searchMessages }
