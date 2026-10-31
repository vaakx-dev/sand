const leaseMs = 15 * 60_000

export interface ViewedHooks {
  touched(session: string): void
  ended(session: string): void
}

export const createViewed = (hooks: ViewedHooks) => {
  const timers = new Map<string, Timer>()

  const end = (session: string) => {
    const timer = timers.get(session)
    if (!timer) return
    clearTimeout(timer)
    timers.delete(session)
    hooks.ended(session)
  }

  return {
    touch(session: string) {
      clearTimeout(timers.get(session))
      timers.set(session, setTimeout(() => end(session), leaseMs))
      hooks.touched(session)
    },
    has: (session: string) => timers.has(session),
    end,
    clear() {
      for (const session of [...timers.keys()]) end(session)
    },
  }
}

export type Viewed = ReturnType<typeof createViewed>
