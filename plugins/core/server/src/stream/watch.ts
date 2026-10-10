const lingering = 30_000

interface Watch {
  focus: string | undefined
  recent: Map<string, number>
}

export const createWatchers = <S>() => {
  const watches = new Map<S, Watch>()

  const focus = (socket: S, session: string | undefined) => {
    const now = Date.now()
    const watch = watches.get(socket) ?? { focus: undefined, recent: new Map() }
    for (const [id, until] of watch.recent) if (until <= now) watch.recent.delete(id)
    if (watch.focus && watch.focus !== session) watch.recent.set(watch.focus, now + lingering)
    if (session) watch.recent.delete(session)
    watch.focus = session
    watches.set(socket, watch)
  }

  const sees = (socket: S, session: string) => {
    const watch = watches.get(socket)
    if (!watch || watch.focus === session) return true
    return (watch.recent.get(session) ?? 0) > Date.now()
  }

  const forget = (socket: S) => void watches.delete(socket)

  return { focus, sees, forget }
}
