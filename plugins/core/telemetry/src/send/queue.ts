import type { Captured } from './posthog'

const batchSize = 20
const maxBuffered = 1000
const maxAttempts = 5
const baseDelay = 2_000
const maxDelay = 300_000

const retryDelay = (failures: number) => {
  const ceiling = Math.min(maxDelay, baseDelay * 2 ** (failures - 1))
  return ceiling / 2 + (ceiling / 2) * Math.random()
}

export const createQueue = (send: (events: Captured[]) => Promise<void>) => {
  let buffer: Captured[] = []
  let failed: Captured[] = []
  let attempts = 0
  let failures = 0
  let retryAt = 0
  let flushing: Promise<void> | undefined

  const add = (event: Captured) => {
    buffer.push(event)
    if (buffer.length > maxBuffered) buffer = buffer.slice(-maxBuffered)
  }

  const fail = (batch: Captured[]) => {
    failures++
    attempts++
    retryAt = Date.now() + retryDelay(failures)
    failed = attempts < maxAttempts ? batch : []
    if (!failed.length) attempts = 0
  }

  const drain = async () => {
    while (true) {
      const batch = failed.length ? failed : buffer.splice(0, batchSize)
      if (!batch.length) return
      try {
        await send(batch)
      } catch {
        return fail(batch)
      }
      failed = []
      attempts = failures = retryAt = 0
    }
  }

  const flush = () => (flushing ??= drain().finally(() => (flushing = undefined)))

  const tick = () => {
    if (Date.now() >= retryAt) void flush()
  }

  return { add, flush, tick }
}
