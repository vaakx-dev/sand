import type { Conversation } from '../contract'
import type { EngineContext } from '../context'
import type { Owned } from '../owned'
import type { Drive } from './run'
import type { Opener } from './start'

export interface DispatchDeps<C extends Conversation> {
  opener: Opener<C>
  drive: Drive<C>
  running(): boolean
}

export const createDispatch = <C extends Conversation>(ctx: EngineContext, { stores, announce }: Owned<C>, { opener, drive, running }: DispatchDeps<C>) => {
  const hold = (conversation: C, item: string) => {
    stores.pending.hold(conversation, item, true)
    announce.pending(conversation)
  }

  return async (conversation: C) => {
    if (!running() || stores.turns.current(conversation)) return
    const next = stores.pending.next(conversation)
    if (!next) return
    const opening = await opener.prepare(conversation, next.prompt, next.origin).catch(() => undefined)
    if (!opening) return hold(conversation, next.id)
    const started = ctx.ledger.tx(() =>
      stores.turns.current(conversation) || !stores.pending.remove(conversation, next.id) ? undefined : opener.open(opening, next),
    )
    if (!started) return
    announce.pending(conversation)
    drive.start(started)
  }
}

export type Dispatch<C extends Conversation> = ReturnType<typeof createDispatch<C>>
