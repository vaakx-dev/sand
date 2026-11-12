import { promptLabel } from '@sand/chats/contract'
import { type Conversation, type SendInput, type SendResult, type TurnInfo, turnHold } from '../contract'
import type { EngineContext } from '../context'
import type { Owned } from '../owned'
import type { Drive } from './run'
import type { Opener, Opening, Started } from './start'

type Routed<C extends Conversation> = { result: SendResult } & (
  | { kind: 'repeat' }
  | { kind: 'started'; started: Started<C> }
  | { kind: 'pending'; running?: TurnInfo }
)

export interface SendDeps<C extends Conversation> {
  opener: Opener<C>
  drive: Drive<C>
  dispatch(conversation: C): Promise<void>
  recover(): void
}

export const createSend = <C extends Conversation>(ctx: EngineContext, { conversations, stores, announce }: Owned<C>, { opener, drive, dispatch, recover }: SendDeps<C>) => {
  const route = (conversation: C, input: SendInput, opening: Opening<C> | undefined): Routed<C> => {
    const running = stores.turns.current(conversation)
    if (!running && opening) {
      const started = opener.open(opening)
      return { kind: 'started', started, result: { disposition: 'started', turn: started.info.id } }
    }
    const kind = running && input.mode !== 'queue' ? 'steer' : 'queue'
    const label = input.label ?? promptLabel(input.prompt)
    const item = stores.pending.add(conversation, { kind, prompt: input.prompt, label, origin: input.origin ?? 'user' })
    const disposition = kind === 'steer' ? 'steered' : 'queued'
    return { kind: 'pending', running, result: { disposition, pending: item.id, ...(running && { turn: running.id }) } }
  }

  const store = (conversation: C, input: SendInput, opening: Opening<C> | undefined) =>
    ctx.ledger.tx((): Routed<C> => {
      const earlier = stores.receipts.get(conversation, input.clientRequestId)
      if (earlier) return { kind: 'repeat', result: earlier }
      const routed = route(conversation, input, opening)
      stores.receipts.put(conversation, input.clientRequestId, routed.result)
      return routed
    })

  return async (conversation: C, input: SendInput): Promise<SendResult> => {
    const earlier = stores.receipts.get(conversation, input.clientRequestId)
    if (earlier) return earlier
    recover()
    const held = conversations.held?.(conversation) || (await ctx.bail(turnHold, conversation, input.origin ?? 'user'))
    const routing: SendInput = held ? { ...input, mode: 'queue' } : input
    const opening = held || stores.turns.current(conversation) ? undefined : await opener.prepare(conversation, input.prompt, input.origin ?? 'user')
    const routed = store(conversation, routing, opening)
    if (routed.kind === 'started') drive.start(routed.started)
    if (routed.kind === 'pending') {
      announce.pending(conversation)
      if (!routed.running) dispatch(conversation).catch(error => ctx.report(error))
    }
    return routed.result
  }
}
