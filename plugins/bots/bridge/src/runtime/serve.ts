import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { botAsk, botAwait, botRead, botRoster, botStarts, waitLimit } from '../contract'
import type { Ask } from './ask'
import type { BridgeContext } from './context'

const outside = "This message is from an outside agent connected to sand, not from the user. Your reply goes back to it."

export const serveBridge = (ctx: BridgeContext, ask: Ask) =>
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.handle(botRoster, () => ctx.bots.list().map(bot => ({ bot: bot.id, name: bot.name, job: bot.job, status: bot.status }))),
      found.handle(botAsk, ({ bot, prompt, origin, clientRequestId }) => ask.ask(bot, { prompt: `${outside}\n\n${prompt}`, origin, clientRequestId })),
      found.handle(botAwait, ({ bot, turn, timeoutMs = waitLimit }) => ask.wait({ bot, turn, status: 'running' }, AbortSignal.timeout(timeoutMs))),
      found.handle(botRead, ({ bot, ...options }) => ask.read(bot, options)),
      found.handle(botStarts, () => ctx.orchestrator.started('bot')),
    )
  })
