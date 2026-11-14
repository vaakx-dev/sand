import { searchWords, textWords } from '@sand/util'
import { type ChatHits, type ChatOwner, type Fit, fits, type MessageHit } from './contract'
import { echoes, excerptOf } from './excerpt'
import { chatText, fitMatch, type Scope, scopedMatch } from './match'
import { type Block, firstSlot, type Store, timeOf } from './store'
import { weightOf } from './weight'

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

interface Fitted {
  block: Block
  fit: Fit
}

interface Read {
  hit: MessageHit
  whole: boolean
}

interface Titled {
  blocks: Fitted[]
  title: string
}

const DEFAULT_LIMIT = 20
const SHOWN_PER_CHAT = 2
const READ_PER_CHAT = 24
const NEWEST_MATCHES = 2000

const tiers = (words: string[]) =>
  fits
    .map(fit => ({ fit, words: fitMatch(fit, words) }))
    .filter((tier, index, all) => all.findIndex(other => other.words === tier.words) === index)

const fitOrder = ({ fit }: { fit: Fit }) => fits.indexOf(fit)

const newestFirst = (a: Fitted, b: Fitted) => b.block.rowid - a.block.rowid

const bestFirst = (a: Fitted, b: Fitted) => fitOrder(a) - fitOrder(b) || newestFirst(a, b)

const bestRead = (a: Read, b: Read) => fitOrder(a.hit) - fitOrder(b.hit) || Number(b.whole) - Number(a.whole) || b.hit.at - a.hit.at

const bestChat = (a: ChatHits, b: ChatHits) => fitOrder(a) - fitOrder(b) || b.weight - a.weight

const holdsWhole = (text: string, words: string[]) => {
  const said = new Set(textWords(text))
  return words.every(word => said.has(word))
}

const distinctReads = (reads: Read[]) =>
  reads
    .toSorted(bestRead)
    .reduce<Read[]>((kept, read) => (kept.some(other => other.hit.entry === read.hit.entry || echoes(other.hit.excerpt, read.hit.excerpt)) ? kept : [...kept, read]), [])

const fittedBlocks = (store: Store, words: string[], scope: Scope, below: number) => {
  const from = store.oldestOfNewest({ match: scopedMatch(fitMatch('prefixes', words), scope), below, most: NEWEST_MATCHES })
  const tiered = tiers(words).flatMap(tier =>
    store.matching({ match: scopedMatch(tier.words, scope), from, below, most: NEWEST_MATCHES }).map((block): Fitted => ({ block, fit: tier.fit })),
  )
  return [...new Map(tiered.toReversed().map(fitted => [fitted.block.rowid, fitted])).values()]
}

const titled = (store: Store, chats: Chats, blocks: Fitted[]): Titled[] => {
  const { owner, chat } = blocks[0]!.block
  const title = chats.title(owner, chat)
  if (title !== undefined) return [{ blocks, title }]
  store.drop(owner, chat)
  return []
}

const reader =
  (store: Store, words: string[]) =>
  ({ block, fit }: Fitted): Read[] => {
    const text = store.text(block)
    if (text === undefined) return []
    const { entry, role, rowid } = block
    return [{ hit: { entry, block: block.block, role, at: timeOf(rowid), fit, excerpt: excerptOf(text, words) }, whole: holdsWhole(text, words) }]
  }

const chatHits = ({ blocks, title }: Titled, distinct: Read[], hits: MessageHit[]): ChatHits[] => {
  const best = distinct[0]
  if (!best) return []
  const { owner, chat } = blocks[0]!.block
  const at = timeOf(Math.max(...blocks.map(({ block }) => block.rowid)))
  const matches = new Set(blocks.map(({ block }) => block.entry)).size
  const weight = weightOf({ whole: best.whole, distinct: distinct.length, at })
  return [{ owner, chat, title, at, fit: best.hit.fit, weight, matches, hits }]
}

const searchMessages = (store: Store, chats: Chats, { query, owner, chat, before, limit = DEFAULT_LIMIT }: Search): ChatHits[] => {
  const words = searchWords(query)
  if (!words.length || (owner && !chats.tracks(owner))) return []
  const below = before === undefined ? Number.MAX_SAFE_INTEGER : firstSlot(before)
  const found = fittedBlocks(store, words, { owner, chat }, below).filter(({ block }) => chats.tracks(block.owner))
  const byChat = [...Map.groupBy(found, ({ block }) => chatText(block.owner, block.chat)).values()].flatMap(blocks => titled(store, chats, blocks))
  const read = (blocks: Fitted[]) => blocks.flatMap(reader(store, words))

  const inChat = (found: Titled) => {
    const reads = read(found.blocks.toSorted(newestFirst).slice(0, limit))
    return chatHits(found, distinctReads(reads), reads.map(({ hit }) => hit))
  }

  const ranked = (found: Titled) => {
    const distinct = distinctReads(read(found.blocks.toSorted(bestFirst).slice(0, READ_PER_CHAT)))
    return chatHits(found, distinct, distinct.slice(0, SHOWN_PER_CHAT).map(({ hit }) => hit))
  }

  if (chat) return byChat.flatMap(inChat)
  return byChat.flatMap(ranked).toSorted(bestChat).slice(0, limit)
}

export { searchMessages }
