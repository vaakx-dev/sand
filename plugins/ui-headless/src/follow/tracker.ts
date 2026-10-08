import type { JobView } from '../print/progress'

export const createTracker = (root: () => string | undefined) => {
  const family = new Set<string>()
  const inFamily = (session: string) => session === root() || family.has(session)
  const running = new Set<string>()
  let turning = false
  let interrupted = false
  let undelivered = 0
  let settle: (() => void) | undefined

  const idle = () => !turning && !running.size && !undelivered
  const check = () => {
    if (!settle || !idle()) return
    settle()
    settle = undefined
  }

  return {
    has: inFamily,
    running: () => running.size,
    adopt(child: string, parent: string | null) {
      if (!parent || !inFamily(parent)) return false
      family.add(child)
      return true
    },
    turnStarted() {
      turning = true
      interrupted = false
      undelivered = 0
    },
    turnEnded(stopped: boolean) {
      turning = false
      interrupted = stopped
      undelivered = 0
      check()
    },
    jobStarted(job: JobView) {
      if (job.status === 'running' && inFamily(job.parent)) running.add(job.id)
    },
    jobEnded(job: JobView) {
      if (!running.delete(job.id)) return false
      if (job.parent === root() && !turning && !interrupted) undelivered++
      check()
      return true
    },
    settled(signal: AbortSignal) {
      if (idle() || signal.aborted) return Promise.resolve()
      return new Promise<void>(resolve => {
        settle = resolve
        signal.addEventListener('abort', () => resolve(), { once: true })
      })
    },
  }
}

export type Tracker = ReturnType<typeof createTracker>
