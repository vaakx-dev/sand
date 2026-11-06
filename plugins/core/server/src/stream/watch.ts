const lingering = 30_000

interface Watch {
  focus: string | undefined
  recent: Map<string, number>
  watched: Set<string>
}

export const createWatchers = <S>() => {
  const watches = new Map<S, Watch>()

  const watchOf = (socket: S) => {
    const watch = watches.get(socket) ?? { focus: undefined, recent: new Map(), watched: new Set() }
    watches.set(socket, watch)
    return watch
  }

  const focus = (socket: S, session: string | undefined) => {
    const now = Date.now()
    const watch = watchOf(socket)
    for (const [id, until] of watch.recent) if (until <= now) watch.recent.delete(id)
    if (watch.focus && watch.focus !== session) watch.recent.set(watch.focus, now + lingering)
    if (session) watch.recent.delete(session)
    watch.focus = session
  }

  const watch = (socket: S, sessions: string[]) => {
    watchOf(socket).watched = new Set(sessions)
  }

  const sees = (socket: S, session: string) => {
    const watch = watches.get(socket)
    if (!watch || watch.focus === session || watch.watched.has(session)) return true
    return (watch.recent.get(session) ?? 0) > Date.now()
  }

  const forget = (socket: S) => void watches.delete(socket)

  const focused = (session: string) => [...watches.values()].some(watch => watch.focus === session)

  return { focus, watch, sees, forget, focused }
}
