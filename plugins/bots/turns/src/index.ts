import { botChange, botRemove, bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { turnHold } from '@sand/engine/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { projectFiles } from '@sand/project/contract'
import { promptBase } from '@sand/prompt/contract'
import { stepPrepare } from '@sand/provider-threads/contract'
import { tools } from '@sand/tools/contract'
import { turns } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { botMayUse } from './allowed'
import { botBrief } from './brief'
import { botOwner } from './owner'

export default definePlugin({
  name: 'bot-turns',
  description: "Adds a bot's extras to its chat's turns: its name, jobs and projects in its prompt, and no turns while it is paused or over its monthly limit",
  inject: { bots, sessions, tools, turns },
  apply(ctx) {
    const brief = botBrief(ctx.bots, () => ctx.get(projectFiles))
    const held = (bot: string) => ctx.bots.get(bot)?.hold !== undefined

    ctx.effect(() => ctx.tools.restrict(botMayUse))
    ctx.on(promptBase, (parts, session) => brief.base(parts, session))
    ctx.on(stepPrepare, async (_request, conversation) => (conversation.owner === 'bot' && brief.stale(conversation.id)) || undefined)
    ctx.on(turnHold, conversation => (conversation.owner === 'bot' && held(conversation.id)) || undefined)
    ctx.watch(orchestrator, found => found?.owner('bot', botOwner(ctx.bots)))
    ctx.on(botChange, bot => {
      const chat = bot.hold && ctx.sessions.open(bot.id)
      if (chat) ctx.turns.interrupt(chat)
    })
    ctx.on(botRemove, brief.forget)
  },
})
