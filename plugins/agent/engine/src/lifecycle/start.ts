import { type Entry, type Message, type Prompt, promptContent, type ToolCallBlock, type UserContent } from '@sand/chats/contract'
import type { Selection } from '@sand/model/contract'
import type { Conversation, Conversations, TurnInfo, TurnOrigin } from '../contract'
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

export interface Resumed<C extends Conversation> {
  conversation: C
  info: TurnInfo
  calls: ToolCallBlock[]
}

export type Begun<C extends Conversation> = Started<C> | Resumed<C>

export const expand = async <C extends Conversation>(conversations: Conversations<C>, content: UserContent[], conversation: C) =>
  (await conversations.prompt?.(content, conversation)) ?? content

export const createOpener = <C extends Conversation>({ conversations, stores, leases }: Owned<C>) => ({
  async prepare(conversation: C, prompt: Prompt, origin: TurnOrigin): Promise<Opening<C>> {
    const selection = conversations.select(conversation)
    if (!selection) throw new Error('Pick a model')
    const user: Message = { role: 'user', content: await expand(conversations, promptContent(prompt), conversation) }
    return { conversation, user, selection, origin }
  },
  open({ conversation, user, selection, origin }: Opening<C>, pending?: string): Started<C> {
    const id = Bun.randomUUIDv7()
    const entry = conversation.append('message', user, { turn: id })
    const info = stores.turns.open({
      id,
      conversation,
      origin,
      selection,
      prompt: entry.id,
      holder: leases.holder,
      lease: leases.until(),
      started: entry.at,
      ...(pending && { pending }),
    })
    return { conversation, info, entry, user }
  },
})

export type Opener<C extends Conversation> = ReturnType<typeof createOpener<C>>
