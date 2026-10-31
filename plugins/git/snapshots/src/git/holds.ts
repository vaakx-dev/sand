export const createHolds = (busy: () => () => void) => {
  const running = new Set<Promise<void>>()

  const hold = <T>(work: () => Promise<T>): Promise<T> => {
    const release = busy()
    const done = work().finally(release)
    const settled = done.then(
      () => undefined,
      () => undefined,
    )
    running.add(settled)
    void settled.then(() => running.delete(settled))
    return done
  }

  const drain = async () => {
    await Promise.all(running)
  }

  return { hold, drain }
}
