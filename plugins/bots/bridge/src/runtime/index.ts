import { sessionEntry } from '@sand/chats/contract'
import { contextKinds } from '@sand/context/contract'
import { threadStarted } from '@sand/orchestrator/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { botStartedWire, botStarts } from '../contract'
import { inject } from './context'
import { botContext } from './kind'
import { routeMentions } from './mention'
import { replyView } from './view'

const soleProject = (projects: string[]) => (projects.length === 1 ? projects[0] : undefined)

export default definePlugin({
  name: 'bot-bridge',
  description:
    'Lets threads and bots work together: threads @ bots in messages and see their replies, and bots start threads and hear back when they finish',
  inject,
  apply(ctx) {
    ctx.on(sessionEntry, routeMentions(ctx))
    ctx.effect(() => ctx.entryViews.register(replyView(ctx.bots, ctx.botTurns)))
    ctx.on(threadStarted, (thread, { owner, id }) => void (owner === 'bot' && ctx.get(server)?.broadcast(botStartedWire, [thread, id])))
    ctx.effect(() =>
      ctx.orchestrator.owner('bot', {
        deliver: (bot, { text, clientRequestId }) => ctx.bots.get(bot) && ctx.botTurns.send(bot, { prompt: text, origin: 'job', clientRequestId }),
        label: bot => ctx.bots.get(bot)?.name || undefined,
        project: bot => soleProject(ctx.bots.get(bot)?.projects ?? []),
      }),
    )
    ctx.watch(contextKinds, found => found?.register(botContext(ctx.bots)))
    ctx.watch(server, found => found?.handle(botStarts, () => ctx.orchestrator.started('bot')))
  },
})
