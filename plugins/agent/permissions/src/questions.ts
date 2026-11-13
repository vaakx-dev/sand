export type Ending = 'answered' | 'expired' | 'cancelled' | 'moved'

export const createQuestions = () => {
  const pending = new Map<string, (ending: Ending) => void>()

  const wait = (id: string, deadline: number, signal: AbortSignal) =>
    new Promise<Ending>(resolve => {
      const end = (ending: Ending) => {
        pending.delete(id)
        clearTimeout(timer)
        signal.removeEventListener('abort', cancel)
        resolve(ending)
      }
      const cancel = () => end('cancelled')
      const timer = setTimeout(() => end('expired'), Math.max(0, deadline - Date.now()))
      signal.addEventListener('abort', cancel, { once: true })
      pending.set(id, end)
      if (signal.aborted) cancel()
    })

  return {
    wait,
    answered: (id: string) => pending.get(id)?.('answered'),
    stop: () => [...pending.values()].forEach(end => end('cancelled')),
    move: () => [...pending.values()].forEach(end => end('moved')),
  }
}

export type Questions = ReturnType<typeof createQuestions>
