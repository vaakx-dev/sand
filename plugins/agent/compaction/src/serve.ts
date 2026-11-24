import { engine, type Conversation, type ConversationRef } from '@sand/engine/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import {
  type Compacted,
  contextChange,
  contextCompact,
  contextGet,
  contextUsage,
  type ContextUsage,
  helloIdleShares,
  type IdleShares,
  idleSharesChange,
  idleSharesSet,
} from './contract'

interface IdleSetting {
  current(): IdleShares
  set(next: IdleShares): Promise<IdleShares>
}

interface Actions {
  read(conversation: Conversation): Promise<ContextUsage | undefined>
  compact(conversation: ConversationRef): Promise<Compacted>
  idle: IdleSetting
}

export const serveContext = (ctx: Context, server: Server, { read, compact, idle }: Actions) =>
  joinDisposers(
    server.handle(contextGet, ({ session, owner }) => {
      const conversation = ctx.get(engine)?.open({ owner, id: session })
      return conversation ? read(conversation) : undefined
    }),
    server.handle(contextCompact, ({ session, owner }) => compact({ owner, id: session })),
    server.hello(helloIdleShares, idle.current),
    server.handle(idleSharesSet, async next => {
      const saved = await idle.set(next)
      server.broadcast(idleSharesChange, saved)
      return saved
    }),
    ctx.on(contextUsage, (conversation, usage) => server.broadcast(contextChange, [conversation.id, usage])),
  )
