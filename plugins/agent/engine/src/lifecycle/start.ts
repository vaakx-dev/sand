import { type Entry, type Message, type Prompt, promptContent, type UserContent } from '@sand/chats/contract'
import type { Selection } from '@sand/model/contract'
import { type Conversation, type Conversations, type PendingItem, type TurnInfo, turnContent, type TurnOrigin } from '../contract'
import type { EngineContext } from '../context'
import type { Resumption } from '../loop/turn'
import type { Owned } from '../owned'

export interface Opening<C extends Conversation> {
  conversation: C
  user: Message
  selection: Selection
  origin: TurnOrigin
}

export interface Started<C extends Conversation> {
  conversation: C
  info: TurnInfo
  entry: Entry
  user: Message
}

export interface Resumed<C extends Conversation> extends Resumption {
  conversation: C
  info: TurnInfo
}

export type Begun<C extends Conversation> = Started<C> | Resumed<C>

export const expand = async <C extends Conversation>(ctx: EngineContext, conversations: Conversations<C>, content: UserContent[], conversation: C) =>
  ctx.waterfall(turnContent, (await conversations.prompt?.(content, conversation)) ?? content, conversation)

export const createOpener = <C extends Conversation>(ctx: EngineContext, { conversations, stores, leases }: Owned<C>) => ({
  async prepare(conversation: C, prompt: Prompt, origin: TurnOrigin): Promise<Opening<C>> {
    const selection = conversations.select(conversation)
    if (!selection) throw new Error('Pick a model')
    const user: Message = { role: 'user', content: await expand(ctx, conversations, promptContent(prompt), conversation) }
    return { conversation, user, selection, origin }
  },
  open({ conversation, user, selection, origin }: Opening<C>, queued?: Pick<PendingItem, 'id' | 'at'>): Started<C> {
    const id = Bun.randomUUIDv7()
    const started = Date.now()
    const entry = conversation.append('message', user, { turn: id, at: queued?.at ?? started })
    const info = stores.turns.open({
      id,
      conversation,
      origin,
      selection,
      prompt: entry.id,
      holder: leases.holder,
      lease: leases.until(),
      started,
      ...(queued && { pending: queued.id }),
    })
    return { conversation, info, entry, user }
  },
})

export type Opener<C extends Conversation> = ReturnType<typeof createOpener<C>>
