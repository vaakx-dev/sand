import type { Caller } from '@sand/host-hub/contract'
import { changeOf } from './change'
import type { PcChange, PcReport, Range } from './contract'

interface Watcher {
  range: Range
  last?: PcReport
}

interface Hooks {
  report(range: Range): Promise<PcReport>
  tell(caller: Caller, change: PcChange): void
  fail(error: unknown): void
  everyMs: number
}

class Watchers {
  readonly #watching = new Map<Caller, Watcher>()
  readonly #hooks: Hooks
  #sentAt = 0

  constructor(hooks: Hooks) {
    this.#hooks = hooks
  }

  async watch(caller: Caller, range: Range) {
    const watcher: Watcher = { range }
    this.#watching.set(caller, watcher)
    watcher.last = await this.#hooks.report(range)
    return watcher.last
  }

  leave(caller: Caller) {
    this.#watching.delete(caller)
  }

  heard(at: number) {
    if (!this.#watching.size || at - this.#sentAt < this.#hooks.everyMs) return
    this.#sentAt = at
    void this.#reports().then(reports => this.#send(reports), this.#hooks.fail)
  }

  async #reports() {
    const ranges = new Set([...this.#watching.values()].map(watcher => watcher.range))
    return new Map(await Promise.all([...ranges].map(async range => [range, await this.#hooks.report(range)] as const)))
  }

  #update(caller: Caller, watcher: Watcher, now: PcReport) {
    const change = watcher.last && changeOf(watcher.last, now)
    watcher.last = now
    if (change) this.#hooks.tell(caller, change)
  }

  #send(reports: Map<Range, PcReport>) {
    for (const [caller, watcher] of this.#watching) {
      const now = reports.get(watcher.range)
      if (now) this.#update(caller, watcher, now)
    }
  }
}

export { Watchers }
