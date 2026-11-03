import { serial } from '@sand/util'

export const paced = (gapMs: number) => {
  const oneAtATime = serial()
  let lastAskedAt = 0
  const afterGap = async (signal: AbortSignal) => {
    const wait = lastAskedAt + gapMs - Date.now()
    if (wait > 0) await Bun.sleep(wait)
    signal.throwIfAborted()
    lastAskedAt = Date.now()
  }
  return <T>(signal: AbortSignal, ask: () => Promise<T>) => oneAtATime(() => afterGap(signal).then(ask))
}
