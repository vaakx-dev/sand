import type { Entry } from '@sand/chats/contract'
import { blockKey, type ShownChat } from '@sand/transcript/contract'
import { textMatches } from '@sand/util'
import { batch, derive, sig, untrack } from '@vaakx-dev/vrui'
import type { FoundBlock } from '../contract'
import { textBlocks } from '../counts'
import { bringIntoView, drawnRows, paint, rangesIn, unpaint } from './integrations/marks'
import { type Direction, firstFrom, kept, type Place, sameBlock, type Spot, type Start, stepped, ordinal, total } from './order'

export type Ask = (query: string, before: string | undefined) => Promise<FoundBlock[]>

export interface FinderParts {
  chat: ShownChat
  ask: Ask
  coveredPx(): number
}

interface Older {
  before?: string
  blocks: FoundBlock[]
}

interface Shown {
  entry: Entry
  block: number
  text: string
  row?: HTMLElement
}

interface Scan {
  blocks: FoundBlock[]
  ranges: Map<string, Range[]>
  shown: Shown[]
}

const placeKey = ({ entry, block }: Place) => `${entry}:${block}`

const firstSpot = ({ entry, block }: Place): Spot => ({ entry, block, occurrence: 0 })

class Finder {
  readonly query = sig('')
  readonly searching = sig(false)
  readonly blocks = sig<FoundBlock[]>([])
  readonly current = sig<Spot | undefined>(undefined)
  readonly count = derive(() => total(this.blocks.get()))
  readonly label = derive(() => {
    const count = this.count.get()
    if (!this.query.get().trim()) return ''
    if (!count) return 'No matches'
    const spot = this.current.get()
    const at = (spot && ordinal(this.blocks.get(), spot)) ?? 0
    return `${at + 1} of ${count}`
  })
  readonly #chat: ShownChat
  readonly #ask: Ask
  readonly #coveredPx: () => number
  #older: Older = { blocks: [] }
  #ranges = new Map<string, Range[]>()
  #asked = 0
  #going = 0

  constructor({ chat, ask, coveredPx }: FinderParts) {
    this.#chat = chat
    this.#ask = ask
    this.#coveredPx = coveredPx
  }

  #shown(): Shown[] {
    const rows = drawnRows(this.#chat.scroller)
    return this.#chat.loaded().flatMap(entry => textBlocks(entry).map(({ block, text }) => ({ entry, block, text, row: rows.get(blockKey(entry, block)) })))
  }

  #scan(query: string): Scan {
    const shown = this.#shown()
    const ranges = new Map<string, Range[]>()
    const local = shown.map(({ entry, block, text, row }) => {
      const place = { entry: entry.id, block }
      const drawn = row && rangesIn(row, query)
      if (drawn) ranges.set(placeKey(place), drawn)
      return { ...place, count: drawn?.length ?? textMatches(text, query).length }
    })
    const loaded = new Set(this.#chat.loaded().map(entry => entry.id))
    const older = this.#older.blocks.filter(found => !loaded.has(found.entry))
    return { blocks: [...older, ...local.filter(found => found.count > 0)], ranges, shown }
  }

  #start(blocks: FoundBlock[], { shown, ranges }: Scan): Start {
    const top = this.#chat.scroller.getBoundingClientRect().top + this.#coveredPx()
    const first = shown.find(({ row }) => row && row.getBoundingClientRect().bottom > top)
    if (!first) return { at: blocks.length, occurrence: 0 }
    const order = new Map(this.#chat.loaded().map((entry, index) => [entry.id, index]))
    const firstAt = order.get(first.entry.id) ?? 0
    const behind = ({ entry, block }: FoundBlock) => {
      const at = order.get(entry) ?? -1
      return at < firstAt || (at === firstAt && block < first.block)
    }
    const at = blocks.findIndex(found => !behind(found))
    const above = ranges.get(placeKey({ entry: first.entry.id, block: first.block }))?.filter(range => range.getBoundingClientRect().bottom <= top)
    return { at: at < 0 ? blocks.length : at, occurrence: above?.length ?? 0 }
  }

  #paint() {
    const spot = this.current.get()
    const current = spot && this.#ranges.get(placeKey(spot))?.[spot.occurrence]
    paint([...this.#ranges.values()].flat(), current)
    return current
  }

  #olderStale() {
    const { before } = this.#older
    return before !== undefined && !this.#chat.loaded().some(entry => entry.id === before)
  }

  async #go() {
    const going = ++this.#going
    const tried = new Set<string>()
    for (let spot = this.current.get(); spot && !tried.has(placeKey(spot)); ) {
      tried.add(placeKey(spot))
      await this.#chat.reveal(spot.entry, spot.block)
      if (going !== this.#going) return
      const range = this.refresh()
      if (range) return bringIntoView(this.#chat.scroller, range, this.#coveredPx())
      spot = this.current.get()
    }
  }

  #clear() {
    this.#ranges = new Map()
    batch(() => {
      this.searching.set(false)
      this.blocks.set([])
      this.current.set(undefined)
    })
    unpaint()
  }

  async find(query: string, at?: Place) {
    const asked = ++this.#asked
    this.#going++
    this.query.set(query)
    if (!query.trim()) return this.#clear()
    this.searching.set(true)
    const before = this.#chat.loaded()[0]?.id
    const older = await this.#ask(query, before).catch((): FoundBlock[] => [])
    if (asked !== this.#asked) return
    this.#older = { before, blocks: older }
    const scan = this.#scan(query)
    const target = at && scan.blocks.find(found => sameBlock(found, at))
    this.#ranges = scan.ranges
    batch(() => {
      this.searching.set(false)
      this.blocks.set(scan.blocks)
      this.current.set(target ? firstSpot(target) : firstFrom(scan.blocks, this.#start(scan.blocks, scan)))
    })
    this.#paint()
    await this.#go()
  }

  refresh() {
    const query = untrack(() => this.query.get())
    if (!query.trim() || untrack(() => this.searching.get())) return undefined
    if (this.#olderStale()) return void this.find(query, untrack(() => this.current.get()))
    const scan = this.#scan(query)
    const spot = untrack(() => this.current.get())
    this.#ranges = scan.ranges
    batch(() => {
      this.current.set(spot && kept(untrack(() => this.blocks.get()), scan.blocks, spot))
      this.blocks.set(scan.blocks)
    })
    return this.#paint()
  }

  step(by: Direction) {
    this.current.set(stepped(untrack(() => this.blocks.get()), untrack(() => this.current.get()), by))
    this.#paint()
    void this.#go()
  }

  close() {
    this.#asked++
    this.#going++
    unpaint()
  }
}

export { Finder }
