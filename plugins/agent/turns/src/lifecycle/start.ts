import { type Entry, type Message, type Prompt, promptContent, type Session } from '@sand/chats/contract'
import type { Selection } from '@sand/model/contract'
import { type TurnInfo, type TurnOrigin, turnPrompt } from '@sand/turns-contract/contract'
import type { TurnsContext } from '../context'
import type { TurnStore } from '../store/turns'
import type { Leases } from './lease'

export interface Opening {
  session: Session
  user: Message
  selection: Selection
  origin: TurnOrigin
}

export interface Started {
  session: Session
  info: TurnInfo
  entry: Entry
  user: Message
}

export const createOpener = (ctx: TurnsContext, store: TurnStore, leases: Leases) => ({
  async prepare(session: Session, prompt: Prompt, origin: TurnOrigin): Promise<Opening> {
    const selection = ctx.modelSettings.select(session)
    if (!selection) throw new Error('Pick a model')
    const user: Message = { role: 'user', content: await ctx.waterfall(turnPrompt, promptContent(prompt), session) }
    return { session, user, selection, origin }
  },
  open({ session, user, selection, origin }: Opening): Started {
    const id = Bun.randomUUIDv7()
    const entry = session.append('message', user, { turn: id })
    const info = store.open({ id, session: session.id, origin, selection, prompt: entry.id, owner: leases.owner, lease: leases.until(), started: entry.at })
    return { session, info, entry, user }
  },
})

export type Opener = ReturnType<typeof createOpener>
