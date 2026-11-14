import { DAY_MS } from '@sand/util'

type Visit = [key: string, count: number, atMs: number]

interface Tally {
  count: number
  atMs: number
}

interface VisitsOptions {
  saved: Visit[]
  save(visits: Visit[]): void
  now?(): number
}

const HALF_LIFE_MS = 7 * DAY_MS
const MOST_KEYS = 300
const HALF_USE_COUNT = 2

const decayed = ({ count, atMs }: Tally, nowMs: number) => count * 0.5 ** ((nowMs - atMs) / HALF_LIFE_MS)

class Visits {
  readonly #tallies: Map<string, Tally>
  readonly #save: (visits: Visit[]) => void
  readonly #now: () => number

  constructor({ saved, save, now = Date.now }: VisitsOptions) {
    this.#tallies = new Map(saved.map(([key, count, atMs]) => [key, { count, atMs }]))
    this.#save = save
    this.#now = now
  }

  record(key: string) {
    const nowMs = this.#now()
    const before = this.#tallies.get(key)
    this.#tallies.set(key, { count: (before ? decayed(before, nowMs) : 0) + 1, atMs: nowMs })
    this.#save(this.#prune(nowMs))
  }

  used(key: string) {
    const tally = this.#tallies.get(key)
    if (!tally) return 0
    const count = decayed(tally, this.#now())
    return count / (count + HALF_USE_COUNT)
  }

  #prune(nowMs: number): Visit[] {
    const strongest = [...this.#tallies]
      .map(([key, tally]): Visit => [key, decayed(tally, nowMs), nowMs])
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, MOST_KEYS)
    this.#tallies.clear()
    for (const [key, count, atMs] of strongest) this.#tallies.set(key, { count, atMs })
    return strongest
  }
}

export { Visits, type Visit }
