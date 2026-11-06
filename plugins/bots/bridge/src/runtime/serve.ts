import type { Actor } from '@sand/host-hub/contract'
import { failure, originOf } from '@sand/orchestrator/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { BotSummary } from '@sand/bots/contract'
import { botAsk, botAwait, botProject, botRead, botRoster, type BotRow, botStarts, waitLimit } from '../contract'
import { type Ask, sentAnswer } from './ask'
import type { BridgeContext } from './context'
import { type Sender, toBot } from './relay'
import type { Replies } from './replies'

const jobLength = 200

const outside = 'This message is from an outside agent, not from the user. Your reply goes back to it.'

const intro: Record<Sender['kind'], (label: string) => string> = {
  bot: label => `This message is from ${label}, another of the user's bots, not from the user. Your reply goes back to it.`,
  thread: label => `This message is from the agent working in the user's thread "${label}", not from the user. Your reply goes back to it.`,
}

const rowOf = ({ id, name, job, status, project }: BotSummary): BotRow => ({ bot: id, name, job: job.slice(0, jobLength), status, project })

export const serveBridge = (ctx: BridgeContext, ask: Ask, replies: Replies) => {
  const senderOf = ({ owner, id }: Actor): Sender =>
    owner === 'bot' ? { kind: 'bot', id, label: ctx.bots.get(id)?.name ?? 'a bot' } : { kind: 'thread', id, label: ctx.sessions.open(id)?.title || 'a thread' }

  const promptOf = (actor: Actor | undefined, prompt: string) => {
    if (!actor) return `${outside}\n\n${prompt}`
    const sender = senderOf(actor)
    return toBot(sender, `${intro[sender.kind](sender.label)}\n\n${prompt}`)
  }

  const botOf = (bot: string | undefined, actor: Actor | undefined) => {
    const id = bot ?? (actor?.owner === 'bot' ? actor.id : undefined)
    if (!id) throw failure('invalid_request', 'Name the bot')
    return id
  }

  const placed = (project: string | null) => {
    if (project !== null && !ctx.projectFiles.copies().some(copy => copy.project === project)) throw failure('not_found', `Project ${project} has no folder on this PC`)
    return project
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
      found.handle(botRead, ({ bot, ...options }) => ask.read(bot, options)),
      found.handle(botProject, ({ bot, project }, { actor }) => rowOf(ctx.bots.update(botOf(bot, actor), { project: placed(project) }))),
      found.handle(botStarts, () => ctx.orchestrator.started('bot')),
    )
  })
}
