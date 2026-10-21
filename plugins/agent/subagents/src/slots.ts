type Release = () => void

export const slots = (max: number) => {
  let used = 0
  const waiting: Array<() => void> = []

  const grant = (): Release => {
    used++
    let released = false
    return () => {
      if (released) return
      released = true
      used--
      waiting.shift()?.()
    }
  }

  const queue = (signal: AbortSignal) =>
    new Promise<Release>((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason)
      const admit = () => {
        signal.removeEventListener('abort', abort)
        resolve(grant())
      }
      const abort = () => {
        waiting.splice(waiting.indexOf(admit), 1)
        reject(signal.reason)
      }
      waiting.push(admit)
      signal.addEventListener('abort', abort, { once: true })
    })

  return async (signal: AbortSignal): Promise<Release> => (used < max ? grant() : queue(signal))
}
