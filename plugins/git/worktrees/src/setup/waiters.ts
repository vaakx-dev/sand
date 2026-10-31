export const createWaiters = () => {
  const waiting = new Map<string, Set<() => void>>()

  const wait = (key: string, signal: AbortSignal) =>
    new Promise<void>(resolve => {
      const group = waiting.get(key) ?? new Set()
      waiting.set(key, group)
      const finish = () => {
        group.delete(finish)
        signal.removeEventListener('abort', finish)
        resolve()
      }
      group.add(finish)
      signal.addEventListener('abort', finish, { once: true })
      if (signal.aborted) finish()
    })

  const wake = (key: string) => {
    const group = waiting.get(key)
    waiting.delete(key)
    for (const finish of [...(group ?? [])]) finish()
  }

  return {
    wait,
    wake,
    wakeAll: () => [...waiting.keys()].forEach(wake),
  }
}
