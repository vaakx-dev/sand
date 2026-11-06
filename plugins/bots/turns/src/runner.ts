import { attachments } from '@sand/attachments/contract'
import { botMemory } from '@sand/bot-memory/contract'
import { bots, type BotStatus } from '@sand/bots/contract'
import type { Conversation, Conversations, TurnStatus } from '@sand/engine/contract'
import { modelSettings, modelSource } from '@sand/model/contract'
import { contextOverflow, providerThreads } from '@sand/provider-threads/contract'
import { tools } from '@sand/tools/contract'
import type { Context } from 'drydock'
import { mkdirSync } from 'node:fs'
import { conversationOf } from './conversation'
import type { Live } from './live'

export const inject = { bots, botMemory, modelSettings, tools, providerThreads }

export type BotTurnsContext = Context<typeof inject>

const statuses: Record<TurnStatus, BotStatus> = {
  running: 'working',
  waiting: 'waiting',
  completed: 'idle',
  interrupted: 'idle',
  failed: 'failed',
  lost: 'failed',
}

export const botConversations = (ctx: BotTurnsContext, live: Live): Conversations<Conversation> => {
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
    step: (conversation, turn, signal) => ctx.providerThreads.step(conversation, turn, signal),
    abandon: thread => ctx.providerThreads.abandon(thread),
    prompt: content => ctx.get(attachments)?.label(content) ?? content,
    overflow: (conversation, turn, error, signal) => ctx.bail(contextOverflow, conversation, turn, error, signal),
    changed(turn) {
      if (turn.ended) live.clear(turn.conversation)
      ctx.bots.status(turn.conversation, statuses[turn.status])
    },
    streamed: (event, conversation) => live.push(conversation.id, event),
  }
}
