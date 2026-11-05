import { type Message, type Prompt, promptContent, type Session } from '@sand/chats/contract'
import { turnPrompt } from '@sand/loop/contract'
import type { TurnsContext } from '../context'
import type { TurnStore } from '../store/turns'
import type { Leases } from './lease'

export const turnStarter = (ctx: TurnsContext, store: TurnStore, leases: Leases) => async (session: Session, prompt: Prompt) => {
  const selection = ctx.modelSettings.select(session)
  if (!selection) throw new Error('Pick a model')
  const user: Message = { role: 'user', content: await ctx.waterfall(turnPrompt, promptContent(prompt), session) }
  const id = Bun.randomUUIDv7()
  return ctx.ledger.tx(() => {
    if (store.current(session.id)) throw new Error('A turn is already running in this chat')
    const entry = session.append('message', user, { turn: id })
    const info = store.open({ id, session: session.id, selection, prompt: entry.id, owner: leases.owner, lease: leases.until(), started: entry.at })
    return { info, entry, user }
  })
}
