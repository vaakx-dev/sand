import type { Caller, CallerKind, WireHost } from '@sand/host-hub/contract'
import { type Fix, locationAsk, locationSettled } from '../contract'

type Sharer = Extract<CallerKind, 'phone' | 'browser'>

interface Located {
  fix: Fix
  device: string
  kind: Sharer
}

interface Timing {
  waitMs: number
  phoneGraceMs: number
}

type Settle = (located: Located | undefined) => void

const sharer = (kind: CallerKind): kind is Sharer => kind === 'phone' || kind === 'browser'

class Ask {
  readonly #settle: Settle
  readonly #timing: Timing
  readonly #wait: Timer
  #browser?: Located
  #grace?: Timer

  constructor(timing: Timing, settle: Settle) {
    this.#timing = timing
    this.#settle = settle
    this.#wait = setTimeout(() => this.settle(this.#browser), timing.waitMs)
  }

  answer(located: Located) {
    if (located.kind === 'phone') return this.settle(located)
    if (this.#browser) return
    this.#browser = located
    this.#grace = setTimeout(() => this.settle(located), this.#timing.phoneGraceMs)
  }

  settle(located?: Located) {
    clearTimeout(this.#wait)
    clearTimeout(this.#grace)
    this.#settle(located)
  }
}

class Asks {
  readonly #open = new Map<string, Ask>()
  readonly #timing: Timing
  readonly #wire: Pick<WireHost, 'broadcast'>

  constructor(timing: Timing, wire: Pick<WireHost, 'broadcast'>) {
    this.#timing = timing
    this.#wire = wire
  }

  locate(signal: AbortSignal) {
    const id = Bun.randomUUIDv7()
    return new Promise<Located | undefined>(resolve => {
      const abort = () => ask.settle()
      const ask = new Ask(this.#timing, located => {
        signal.removeEventListener('abort', abort)
        this.#open.delete(id)
        this.#wire.broadcast(locationSettled, { id })
        resolve(located)
      })
      this.#open.set(id, ask)
      signal.addEventListener('abort', abort, { once: true })
      this.#wire.broadcast(locationAsk, { id })
    })
  }

  answer(id: string, fix: Fix, { device, kind }: Caller) {
    if (!sharer(kind)) return
    this.#open.get(id)?.answer({ fix, device, kind })
  }

  stop() {
    for (const ask of this.#open.values()) ask.settle()
  }
}

export { Asks, type Located }
