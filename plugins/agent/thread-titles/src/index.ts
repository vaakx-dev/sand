import { ask } from '@sand/ask/contract'
import { type Message, quickTitle, type Session, sessions } from '@sand/chats/contract'
import { turnStart } from '@sand/turns-contract/contract'
import { errorMessage } from '@sand/util'
import { definePlugin } from 'drydock'
import { askTitle } from './ask'

const deadline = 15_000

export default definePlugin({
  name: 'thread-titles',
  description: 'Titles a new thread with a small fast model while its first turn runs, keeping any name the user gave it meanwhile',
  inject: { ask, sessions },
  apply(ctx) {
    const unloaded = new AbortController()
    ctx.effect(() => () => unloaded.abort())

    const retitle = async (session: Session, message: Message, quick: string, signal: AbortSignal) => {
      const title = await askTitle(ctx.ask, session, message, signal)
      if (ctx.sessions.open(session.id)?.title === quick) ctx.sessions.rename(session.id, title)
    }

    ctx.on(turnStart, (session, message) => {
      const quick = quickTitle(message)
      if (session.kind !== 'thread' || !quick || session.title !== quick) return
      const signal = AbortSignal.any([unloaded.signal, AbortSignal.timeout(deadline)])
      retitle(session, message, quick, signal).catch(error => {
        if (!unloaded.signal.aborted) ctx.report(new Error(`Kept the short title of ${session.id}: ${errorMessage(error)}`))
      })
    })
  },
})
