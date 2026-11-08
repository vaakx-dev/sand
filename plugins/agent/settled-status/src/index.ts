import { type Session, sessionRemove, sessions, sessionSettle } from '@sand/chats/contract'
import { server } from '@sand/server/contract'
import { type SubModel, subModel } from '@sand/sub-model/contract'
import { definePlugin } from 'drydock'
import { askStatus, statusJob } from './ask'
import { createBook } from './book'
import { helloSettledStatus, settledStatusChange } from './contract'

export default definePlugin({
  name: 'settled-status',
  description: 'When a thread settles, asks the sub model for one line on where it ended, and clears it when the thread comes back',
  inject: { sessions },
  apply(ctx) {
    const book = createBook(ctx.sessions)

    const save = (session: Session, text: string | null) => {
      book.write(session, text)
      ctx.get(server)?.broadcast(settledStatusChange, { session: session.id, text })
    }

    const write = async (sub: SubModel, session: Session, settled: number) => {
      const text = await askStatus(sub, session)
      if (text && ctx.sessions.open(session.id)?.settled === settled) save(session, text)
    }

    const settle = (session: Session) => {
      if (session.settled === null) {
        if (book.has(session.id)) save(session, null)
        return
      }
      const sub = ctx.get(subModel)
      if (sub?.has('fast')) write(sub, session, session.settled).catch(error => ctx.report(error))
    }

    ctx.watch(subModel, found => found?.job(statusJob))
    ctx.on(sessionSettle, settle)
    ctx.on(sessionRemove, id => book.forget(id))
    ctx.watch(server, found => found?.hello(helloSettledStatus, book.all))
  },
})
