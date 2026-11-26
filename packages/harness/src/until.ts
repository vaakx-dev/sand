type Falsy = false | null | undefined

interface UntilOptions {
  timeoutMs?: number
}

const POLL_MS = 10

const until = async <T>(found: () => T | Falsy | Promise<T | Falsy>, { timeoutMs = 5_000 }: UntilOptions = {}): Promise<T> => {
  const deadline = performance.now() + timeoutMs
  while (true) {
    const value = await found()
    if (value) return value
    if (performance.now() > deadline) throw new Error(`It still had not happened after ${timeoutMs} ms`)
    await Bun.sleep(POLL_MS)
  }
}

export { until }
