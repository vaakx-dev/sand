import type { RuntimeView } from '@sand/protocol'

export const createWaiters = () => {
  const waiting = new Set<(view: RuntimeView | undefined) => void>()

  const wait = (timeout: number) =>
    new Promise<RuntimeView | undefined>(resolve => {
      const done = (view: RuntimeView | undefined) => {
        clearTimeout(timer)
        waiting.delete(done)
        resolve(view)
      }
      const timer = setTimeout(() => done(undefined), timeout)
      waiting.add(done)
    })

  const resolve = (view: RuntimeView | undefined) => {
    for (const done of [...waiting]) done(view)
  }

  return { wait, resolve }
}
