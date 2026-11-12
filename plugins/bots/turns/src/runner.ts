import { bots, type BotStatus } from '@sand/bots/contract'
import type { Conversation, Conversations, TurnStatus } from '@sand/engine/contract'
import { modelSettings, modelSource } from '@sand/model/contract'
import { contextOverflow, providerThreads } from '@sand/provider-threads/contract'
import { tools } from '@sand/tools/contract'
import type { Context } from 'drydock'
import { mkdirSync } from 'node:fs'
import { conversationOf } from './conversation'
import type { Live } from './live'

export const inject = { bots, modelSettings, tools, providerThreads }

export type BotTurnsContext = Context<typeof inject>

const statuses: Record<TurnStatus, BotStatus> = {
  running: 'working',
  waiting: 'waiting',
  completed: 'idle',
  interrupted: 'idle',
  failed: 'failed',
  lost: 'failed',
}

export const botConversations = (ctx: BotTurnsContext, live: Live, queued: (bot: string) => void): Conversations<Conversation> => {
  const bot = (id: string) => {
    const found = ctx.bots.get(id)
    if (!found) throw new Error(`No bot ${id}`)
    return found
  }

  return {
    owner: 'bot',
    open(id) {
      if (!ctx.bots.get(id)) return undefined
      mkdirSync(ctx.bots.folder(id), { recursive: true })
      return conversationOf(ctx.bots, id)
    },
    select(conversation) {
      const { model, effort, speed } = ctx.modelSettings.resolve(bot(conversation.id).models.main)
      return model ? { source: modelSource(model), model, ...(effort && { effort }), speed } : undefined
    },
    held: conversation => ctx.bots.get(conversation.id)?.hold !== undefined,
    step: (conversation, turn, signal) => ctx.providerThreads.step(conversation, turn, signal),
    abandon: thread => ctx.providerThreads.abandon(thread),
    overflow: (conversation, turn, error, signal) => ctx.bail(contextOverflow, conversation, turn, error, signal),
    changed(turn) {
      if (turn.ended) live.clear(turn.conversation)
      ctx.bots.status(turn.conversation, statuses[turn.status])
    },
    streamed: (event, conversation) => live.push(conversation.id, event),
    queued: conversation => queued(conversation.id),
  }
}
