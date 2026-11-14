import type { Pcs, Wire } from '@sand/devices-contract'
import { searchWords } from '@sand/util'
import { type Found, type Indexing, type MessageHit, messagesSearch } from '../contract'

export interface PcHit extends MessageHit {
  pc: string
}

export interface Searched {
  hits: PcHit[]
  indexing?: Indexing
}

interface Cached {
  searched: Searched
  atMs: number
}

interface Searcher {
  wire: Wire
  pcs: Pcs
}

const CACHE_MS = 30_000
const MOST_CACHED = 50
const HITS_PER_PC = 30

const keptHits = (pc: string, home: string, { hits }: Found): PcHit[] => hits.filter(hit => hit.owner === 'thread' || pc === home).map(hit => ({ ...hit, pc }))

const totalIndexing = (found: Found[]) => {
  const busy = found.flatMap(({ indexing }) => (indexing ? [indexing] : []))
  return busy.length ? busy.reduce((sum, { done, total }) => ({ done: sum.done + done, total: sum.total + total })) : undefined
}

class MessageSearch {
  readonly #wire: Wire
  readonly #pcs: Pcs
  readonly #cache = new Map<string, Cached>()

  constructor({ wire, pcs }: Searcher) {
    this.#wire = wire
    this.#pcs = pcs
  }

  async #onPc(pc: string, query: string) {
    try {
      return { pc, found: await this.#wire.call(messagesSearch, { query, limit: HITS_PER_PC }, pc) }
    } catch {
      return undefined
    }
  }

  async #searchPcs(query: string): Promise<Searched> {
    const home = this.#pcs.here().id
    const online = this.#pcs.list().filter(pc => pc.online && this.#wire.ready(pc.id))
    const answers = (await Promise.all(online.map(pc => this.#onPc(pc.id, query)))).filter(answer => answer !== undefined)
    const hits = answers.flatMap(({ pc, found }) => keptHits(pc, home, found))
    const indexing = totalIndexing(answers.map(({ found }) => found))
    return { hits, ...(indexing && { indexing }) }
  }

  #cached(key: string) {
    const cached = this.#cache.get(key)
    return cached && Date.now() - cached.atMs < CACHE_MS ? cached.searched : undefined
  }

  #remember(key: string, searched: Searched) {
    if (searched.indexing) return
    const nowMs = Date.now()
    for (const [old, { atMs }] of this.#cache) if (nowMs - atMs >= CACHE_MS) this.#cache.delete(old)
    this.#cache.delete(key)
    this.#cache.set(key, { searched, atMs: nowMs })
    const oldest = this.#cache.keys().next().value
    if (this.#cache.size > MOST_CACHED && oldest !== undefined) this.#cache.delete(oldest)
  }

  async search(query: string) {
    const key = searchWords(query).join(' ')
    const cached = this.#cached(key)
    if (cached) return cached
    const searched = await this.#searchPcs(query)
    this.#remember(key, searched)
    return searched
  }
}

export { MessageSearch }
