import { botChange, botRemove } from '@sand/bots/contract'
import { engine } from '@sand/engine/contract'
import { projectFiles } from '@sand/project/contract'
import { context } from '@sand/prompt/contract'
import { stepPrepare } from '@sand/provider-threads/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { botBrief, offered } from './brief'
import { botInterrupt, botOpen, botPendingWire, botSend, botStreamWire, botTurns } from './contract'
import { conversationOf } from './conversation'
import { createLive } from './live'
import { finalReply } from './reply'
import { botConversations, inject } from './runner'

export default definePlugin({
  name: 'bot-turns',
  description: "Runs each bot's turns on the shared engine, with its job and memory as instructions and its main model",
  inject: { ...inject, engine, context },
  apply(ctx) {
    const live = createLive((bot, event) => ctx.get(server)?.broadcast(botStreamWire, [bot, event]))
    ctx.effect(() => live.stop)
    const { brief, stale } = botBrief(ctx.bots, ctx.botMemory, ctx.tools, ctx.context, () => ctx.get(projectFiles))
    ctx.effect(() => ctx.providerThreads.brief('bot', brief))
    ctx.on(stepPrepare, async (_request, conversation) => (conversation.owner === 'bot' && stale(conversation.id)) || undefined)
    ctx.effect(() => ctx.tools.offer('bot', () => offered))
    const queued = (bot: string) => ctx.get(server)?.broadcast(botPendingWire, [bot, runner.pending(conversationOf(ctx.bots, bot))])
    const conversations = botConversations(ctx, live, queued)
    const runner = ctx.engine.attach(conversations)
    ctx.effect(() => runner.detach)

    const open = (bot: string) => {
      const conversation = conversations.open(bot)
      if (!conversation) throw new Error(`No bot ${bot}`)
      return conversation
    }
    ctx.provide(botTurns, {
      send: (bot, input) => runner.send(open(bot), input),
      ended: (turn, signal) => runner.wait(turn, 'end', signal),
      follow: (bot, sent, signal) => runner.follow(open(bot), sent, signal),
      final: finalReply(ctx.bots, ctx.engine),
    })

    ctx.on(botChange, bot => {
      if (bot.hold) runner.interrupt(conversationOf(ctx.bots, bot.id))
    })
    ctx.on(botRemove, id => {
      runner.interrupt(conversationOf(ctx.bots, id))
      runner.forget(id)
      ctx.providerThreads.forget({ owner: 'bot', id })
    })
    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(botSend, ({ bot, prompt, clientRequestId }) => runner.send(open(bot), { prompt, clientRequestId })),
        found.handle(botInterrupt, ({ bot }) => runner.interrupt(open(bot))),
        found.handle(botOpen, ({ bot, after }) => ({
          ...ctx.bots.conversation(bot).page({ after }),
          live: live.snapshot(bot),
          pending: runner.pending(open(bot)),
        })),
      )
    })
  },
})
