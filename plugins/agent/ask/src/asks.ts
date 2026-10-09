import type { Server } from '@sand/server/contract'
import type { AskPending, Asks } from './contract'
import { askInput } from './schema'
import type { Waiting } from './waiting'

export const createAsks = (waiting: Waiting, server: Server) => {
  const open = new Map<string, AskPending>()

  const ask: Asks['ask'] = async (session, questions, source, signal) => {
    const pending: AskPending = { id: `ask-${crypto.randomUUID()}`, session: session.id, questions: askInput.parse({ questions }).questions, source }
    open.set(pending.id, pending)
    server.broadcast('ask.open', [pending])
    try {
      return await waiting.wait(pending.id, session.id, signal)
    } finally {
      open.delete(pending.id)
      server.broadcast('ask.close', [session.id, pending.id])
    }
  }

  const all = () => [...open.values()]

  const pending: Asks['pending'] = session => all().filter(entry => entry.session === session.id)

  return { ask, pending, all, close: () => waiting.close(open.keys()) }
}
