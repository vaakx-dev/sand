export const serialized = (task: () => Promise<void>) => {
  let running: Promise<void> | undefined
  let queued: Promise<void> | undefined

  const start = (): Promise<void> => {
    running = task().finally(() => {
      running = undefined
    })
    return running
  }

  const next = () => {
    queued = undefined
    return start()
  }

  return (): Promise<void> => {
    if (!running) return start()
    queued ??= running.then(next, next)
    return queued
  }
}
