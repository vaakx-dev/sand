const queues = new Map<string, Promise<unknown>>()

export const exclusive = <T>(path: string, task: () => Promise<T>) => {
  const next = (queues.get(path) ?? Promise.resolve()).then(task, task)
  const settled = next.catch(() => {})
  queues.set(path, settled)
  settled.then(() => queues.get(path) === settled && queues.delete(path))
  return next
}
