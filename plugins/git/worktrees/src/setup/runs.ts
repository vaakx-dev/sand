interface Run {
  controller: AbortController
  done: Promise<void>
}

export const createRuns = (report: (error: unknown) => void) => {
  const active = new Map<string, Run>()

  return {
    running: (key: string) => active.has(key),
    begin(key: string, work: (signal: AbortSignal) => Promise<void>) {
      if (active.has(key)) return
      const controller = new AbortController()
      const done = work(controller.signal)
        .catch(report)
        .finally(() => active.delete(key))
      active.set(key, { controller, done })
    },
    async stop(key: string) {
      const run = active.get(key)
      if (!run) return
      run.controller.abort()
      await run.done
    },
    abortAll() {
      for (const run of active.values()) run.controller.abort()
    },
  }
}
