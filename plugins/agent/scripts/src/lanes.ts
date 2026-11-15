type Work<T> = () => Promise<T>

const settled = (promise: Promise<unknown>) => promise.then(
  () => undefined,
  () => undefined,
)

const lanes = () => {
  let exclusive: Promise<unknown> = Promise.resolve()
  const shared = new Set<Promise<unknown>>()

  const together = <T>(work: Work<T>) => {
    const running = exclusive.then(work)
    const done = settled(running)
    shared.add(done)
    void done.then(() => shared.delete(done))
    return running
  }

  const alone = <T>(work: Work<T>) => {
    const running = Promise.all([exclusive, ...shared]).then(work)
    exclusive = settled(running)
    return running
  }

  return { together, alone }
}

export { lanes }
