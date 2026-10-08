import type { Dispose } from '../context/types'

export class Disposers {
  private disposers = new Set<Dispose>()

  add(dispose: Dispose) {
    this.disposers.add(dispose)
    return () => void this.disposers.delete(dispose)
  }

  async flush(report: (error: unknown) => void) {
    const disposers = [...this.disposers].reverse()
    this.disposers.clear()
    for (const dispose of disposers) {
      try {
        await dispose()
      } catch (error) {
        report(error)
      }
    }
  }
}
