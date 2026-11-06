import type { Decision } from './contract'

const pollEvery = 2_000

export const createWaiters = (answered: (id: string) => Decision | undefined) => {
  const checks = new Set<() => void>()
  let timer: Timer | undefined

  const check = () => checks.forEach(run => run())

  const stop = () => {
    clearInterval(timer)
    timer = undefined
  }

  const wait = (id: string, signal: AbortSignal) =>
    new Promise<Decision>((resolve, reject) => {
      signal.throwIfAborted()
      const finish = () => {
        checks.delete(run)
        signal.removeEventListener('abort', abort)
        if (!checks.size) stop()
      }
      const run = () => {
        const found = answered(id)
        if (!found) return
        finish()
        resolve(found)
      }
      const abort = () => {
        finish()
        reject(signal.reason)
      }
      checks.add(run)
      signal.addEventListener('abort', abort, { once: true })
      timer ??= setInterval(check, pollEvery)
      run()
    })

  return { wait, wake: check, stop }
}

export type Waiters = ReturnType<typeof createWaiters>
