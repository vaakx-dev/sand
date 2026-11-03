import { timeoutMs } from '../http'

export interface Pace {
  gapMs: number
  lanes: number
}

export const paced = ({ gapMs, lanes }: Pace) => {
  const waiting: (() => void)[] = []
  let sending = 0
  let lastSentAt = -Infinity
  let timer: Timer | undefined

  const next = () => {
    if (timer || sending >= lanes || !waiting.length) return
    const wait = lastSentAt + gapMs - Date.now()
    if (wait > 0) {
      timer = setTimeout(() => {
        timer = undefined
        next()
      }, wait)
      return
    }
    lastSentAt = Date.now()
    sending++
    waiting.shift()?.()
    next()
  }

  const turn = (signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      signal.throwIfAborted()
      const go = () => {
        signal.removeEventListener('abort', leave)
        resolve()
      }
      const leave = () => {
        waiting.splice(waiting.indexOf(go), 1)
        reject(signal.reason)
      }
      signal.addEventListener('abort', leave, { once: true })
      waiting.push(go)
      next()
    })

  return async <T>(signal: AbortSignal, send: (deadline: AbortSignal) => Promise<T>) => {
    await turn(signal)
    try {
      return await send(AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]))
    } finally {
      sending--
      next()
    }
  }
}
