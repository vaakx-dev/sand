import type { Indexing } from './contract'
import type { Store } from './store'

const STEP_MS = 15
const REST_MS = STEP_MS

const deadline = () => performance.now() + STEP_MS

class Keeper {
  private indexing: Indexing | undefined
  private stopped = false

  constructor(
    private readonly store: Store,
    private readonly report: (error: unknown) => void,
  ) {}

  private async steps() {
    while (this.indexing) {
      await Bun.sleep(REST_MS)
      if (this.stopped) return
      const done = this.indexing.done + this.store.step(deadline())
      const left = this.store.lag()
      if (!left) return
      this.indexing = { done, total: done + left }
    }
  }

  private async catchUpInSteps(indexing: Indexing) {
    this.indexing = indexing
    try {
      await this.steps()
    } finally {
      this.indexing = undefined
    }
  }

  refresh() {
    if (this.stopped || this.indexing || !this.store.lag()) return
    const done = this.store.step(deadline())
    const left = this.store.lag()
    if (left) this.catchUpInSteps({ done, total: done + left }).catch(this.report)
  }

  progress() {
    return this.indexing && { indexing: this.indexing }
  }

  stop() {
    this.stopped = true
  }
}

export { Keeper }
