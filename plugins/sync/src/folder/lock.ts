const tails = new Map<string, Promise<unknown>>()

export const locked = <T>(key: string, task: () => Promise<T>): Promise<T> => {
  const run = (tails.get(key) ?? Promise.resolve()).then(task, task)
  const tail = run.then(
    () => undefined,
    () => undefined,
  )
  tails.set(key, tail)
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key)
  })
  return run
}
