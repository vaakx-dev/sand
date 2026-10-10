export const serial = () => {
  let tail: Promise<unknown> = Promise.resolve()
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task)
    tail = run.catch(() => {})
    return run
  }
}

export const keyedSerial = () => {
  const tails = new Map<string, Promise<unknown>>()
  return <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const run = (tails.get(key) ?? Promise.resolve()).then(task)
    const tail = run.catch(() => {})
    tails.set(key, tail)
    void tail.then(() => tails.get(key) === tail && tails.delete(key))
    return run
  }
}
