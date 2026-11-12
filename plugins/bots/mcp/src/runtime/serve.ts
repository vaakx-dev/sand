import { sessions } from '@sand/chats/contract'
import type { Actor } from '@sand/host-hub/contract'
import { failure, originOf } from '@sand/orchestrator/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { botAsk, botAwait, botRoster, waitLimit } from '../contract'
import { rowOf } from '../row'
import { type Ask, sentAnswer } from './ask'
import type { BotsMcpContext } from './context'
import { type Sender, toBot } from './relay'
import type { Replies } from './replies'

const outside = 'This message is from an outside agent, not from the user. Your reply goes back to it.'

const intro: Record<Sender['kind'], (label: string) => string> = {
  bot: label => `This message is from ${label}, another of the user's bots, not from the user. Your reply goes back to it.`,
  thread: label => `This message is from the agent working in the user's thread "${label}", not from the user. Your reply goes back to it.`,
}

export const serveBots = (ctx: BotsMcpContext, ask: Ask, replies: Replies) => {
  const senderOf = ({ owner, id }: Actor): Sender =>
    owner === 'bot'
      ? { kind: 'bot', id, label: ctx.bots.get(id)?.name || 'a bot' }
      : { kind: 'thread', id, label: ctx.get(sessions)?.open(id)?.title || 'a thread' }

  const promptOf = (actor: Actor | undefined, prompt: string) => {
    if (!actor) return `${outside}\n\n${prompt}`
    const sender = senderOf(actor)
    return toBot(sender, `${intro[sender.kind](sender.label)}\n\n${prompt}`)
  }

  return ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.handle(botRoster, () => ctx.bots.list().map(rowOf)),
      found.handle(botAsk, async ({ bot, prompt, origin, clientRequestId }, { actor }) => {
        if (actor?.owner === 'bot' && actor.id === bot) throw failure('invalid_request', "A bot can't message itself")
        const asking = { prompt: promptOf(actor, prompt), origin: originOf(actor, origin), clientRequestId }
        if (actor) return replies.ask(bot, asking, actor)
        return sentAnswer(bot, await ask.send(bot, asking))
      }),
      found.handle(botAwait, ({ bot, turn, timeoutMs = waitLimit }) => ask.wait({ bot, turn, status: 'running' }, AbortSignal.timeout(timeoutMs))),
    )
  })
}
