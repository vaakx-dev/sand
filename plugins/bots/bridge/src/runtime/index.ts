import { sessionEntry } from '@sand/chats/contract'
import { contextKinds } from '@sand/context/contract'
import { threadStarted } from '@sand/orchestrator/contract'
import { promptSections } from '@sand/prompt/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { botStartedWire, botStarts } from '../contract'
import { inject } from './context'
import { botContext } from './kind'
import { threadLinks } from './links'
import { routeMentions } from './mention'
import { replyView } from './view'

export default definePlugin({
  name: 'bot-bridge',
  description:
    'Lets threads and bots work together: threads @ bots in messages and see their replies, and bots start threads and hear back when they finish',
  inject,
  apply(ctx) {
    ctx.on(sessionEntry, routeMentions(ctx))
    ctx.effect(() => ctx.entryViews.register(replyView(ctx.bots, ctx.botTurns)))
    ctx.on(threadStarted, (thread, { owner, id }) => void (owner === 'bot' && ctx.get(server)?.broadcast(botStartedWire, [thread, id])))
    ctx.on(promptSections, (sections, conversation) => (conversation.owner === 'bot' ? [...sections, threadLinks] : sections))
    ctx.watch(contextKinds, found => found?.register(botContext(ctx.bots)))
    ctx.watch(server, found => found?.handle(botStarts, () => ctx.orchestrator.started('bot')))
  },
})
