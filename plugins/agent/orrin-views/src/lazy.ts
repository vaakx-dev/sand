import type { Session } from '@sand/chats/contract'
import { threadOf, type Deps } from './deps'
import { createView } from './views'

export const lazyViews = (deps: Deps) => {
  const making = new Map<string, Promise<void>>()

  const make = (thread: Session) =>
    createView(deps, thread)
      .then(view => void (view && deps.sessions.update(thread.id, { orrinView: view.id })))
      .finally(() => making.delete(thread.id))

  const ensure = async (thread: Session) => {
    if (thread.orrinView) return
    if (!making.has(thread.id)) making.set(thread.id, make(thread))
    await making.get(thread.id)
  }

  return async (session: Session) => {
    const thread = threadOf(deps, session)
    if (!thread) return undefined
    await ensure(thread)
    if (session !== thread && session.orrinView !== thread.orrinView) deps.sessions.update(session.id, { orrinView: thread.orrinView })
    return undefined
  }
}
