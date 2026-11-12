import { sessionEntry } from '@sand/chats/contract'
import { contextKinds } from '@sand/context/contract'
import { subagentStarted } from '@sand/orchestrator/contract'
import { promptSections } from '@sand/prompt/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { botSubagentWire, botSubagents } from '../contract'
import { inject } from './context'
import { botContext } from './kind'
import { threadLinks } from './links'
import { routeMentions } from './mention'
import { replyView } from './view'

export default definePlugin({
  name: 'bot-bridge',
  description:
    "Lets threads and bots work together: threads @ bots in messages and see their replies, bots' chats link the threads they start, and a bot's subagents show in its chat",
  inject,
  apply(ctx) {
    ctx.on(sessionEntry, routeMentions(ctx))
    ctx.effect(() => ctx.entryViews.register(replyView(ctx.bots, ctx.botTurns)))
    ctx.on(subagentStarted, (subagent, { owner, id }) => void (owner === 'bot' && ctx.get(server)?.broadcast(botSubagentWire, [subagent, id])))
    ctx.on(promptSections, (sections, conversation) => (conversation.owner === 'bot' ? [...sections, threadLinks] : sections))
    ctx.watch(contextKinds, found => found?.register(botContext(ctx.bots)))
    ctx.watch(server, found => found?.handle(botSubagents, () => ctx.orchestrator.started('bot')))
  },
})
