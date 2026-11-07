import { botName, type BotSummary, jobEntry, type JobEntry } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import type { Actor } from '@sand/host-hub/contract'
import { failure, originOf } from '@sand/orchestrator/contract'
import { projectFiles } from '@sand/project/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { botAsk, botAwait, botRead, botRoster, type BotRow, botSet, type BotSet, waitLimit } from '../contract'
import { type Ask, sentAnswer } from './ask'
import type { BotsMcpContext } from './context'
import { type Sender, toBot } from './relay'
import type { Replies } from './replies'

const jobLength = 200

const outside = 'This message is from an outside agent, not from the user. Your reply goes back to it.'

const intro: Record<Sender['kind'], (label: string) => string> = {
  bot: label => `This message is from ${label}, another of the user's bots, not from the user. Your reply goes back to it.`,
  thread: label => `This message is from the agent working in the user's thread "${label}", not from the user. Your reply goes back to it.`,
}

const cents = (value: number) => Math.round(value * 100) / 100

const rowOf = (bot: BotSummary): BotRow => ({
  bot: bot.id,
  name: botName(bot),
  job: bot.job.slice(0, jobLength),
  status: bot.status,
  ...(bot.hold && { hold: bot.hold }),
  project: bot.project,
  budget: bot.budget,
  spent: cents(bot.spent),
})

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

  const botOf = (bot: string | undefined, actor: Actor | undefined) => {
    const found = ctx.bots.get(bot ?? (actor?.owner === 'bot' ? actor.id : ''))
    if (!found) throw failure(bot ? 'not_found' : 'invalid_request', bot ? `No bot ${bot}` : 'Name the bot')
    return found
  }

  const placed = (project: string | null) => {
    if (project !== null && !ctx.get(projectFiles)?.copies().some(copy => copy.project === project)) throw failure('not_found', `Project ${project} has no folder on this PC`)
    return project
  }

  const set = ({ bot, name, job, project, paused, budget }: BotSet, actor: Actor | undefined) => {
    const before = botOf(bot, actor)
    if (budget !== undefined && actor?.owner === 'bot' && actor.id === before.id) throw failure('denied', "A bot can't change its own spend limit")
    const after = ctx.bots.update(before.id, {
      ...(name && { name }),
      ...(job && { job }),
      ...(project !== undefined && { project: placed(project) }),
      ...(paused !== undefined && { paused }),
      ...(budget !== undefined && { budget }),
    })
    if (job && job !== before.job) {
      const turn = ctx.engine.turn('bot', before.id)?.id
      ctx.bots.conversation(before.id).append(jobEntry, { job, previous: before.job } satisfies JobEntry, turn ? { turn } : {})
    }
    return rowOf(after)
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
      found.handle(botRead, ({ bot, ...reading }, { actor }) => ask.read(botOf(bot, actor).id, reading)),
      found.handle(botSet, (input, { actor }) => set(input, actor)),
    )
  })
}
