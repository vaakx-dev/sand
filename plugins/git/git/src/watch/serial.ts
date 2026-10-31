export const serialized = (task: () => Promise<void>) => {
  let running: Promise<void> | undefined
  let queued: Promise<void> | undefined

  const start = (): Promise<void> => {
    running = task().finally(() => {
      running = undefined
    })
    return running
  }

  return (): Promise<void> => {
    if (!running) return start()
    queued ??= running
      .catch(() => {})
      .then(() => {
        queued = undefined
        return start()
      })
    return queued
  }
}
