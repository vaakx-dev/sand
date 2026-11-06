import { sessionEntry, sessionRemove } from '@sand/chats/contract'
import { contextKinds } from '@sand/context/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { botStartedWire } from '../contract'
import { createAsk } from './ask'
import { inject } from './context'
import { botContext } from './kind'
import { routeMentions } from './mention'
import { serveBridge } from './serve'
import { openStarts } from './starts'
import { botTools, group } from './tools/bots'
import { threadTools } from './tools/threads'
import { replyView } from './view'

export default definePlugin({
  name: 'bot-bridge',
  description:
    'Lets threads and bots message each other: threads hand bots tasks and @ them in messages, bots start and message threads',
  inject,
  apply(ctx) {
    const ask = createAsk(ctx)
    const starts = openStarts(ctx.ledger, (thread, bot) => ctx.get(server)?.broadcast(botStartedWire, [thread, bot]))
    ctx.on(sessionEntry, routeMentions(ctx, ask))
    ctx.effect(() => ctx.entryViews.register(replyView(ctx.bots, ask)))
    ctx.on(sessionRemove, thread => starts.remove(thread))
    ctx.watch(contextKinds, found => found?.register(botContext(ctx.bots)))
    ctx.effect(() => ctx.tools.group({ name: group, label: 'Bots', summary: "list the user's bots, hand one a task and read its replies", load: 'on-demand' }))
    for (const tool of [...botTools(ctx, ask), ...threadTools(ctx, starts)]) ctx.effect(() => ctx.tools.register(tool))
    serveBridge(ctx, ask, starts)
  },
})
