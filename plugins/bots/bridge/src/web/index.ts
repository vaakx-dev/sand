import { botProfile, botViews } from '@sand/bots/contract'
import { transcript } from '@sand/transcript/contract'
import { composer } from '@sand/composer/contract'
import { contextChips } from '@sand/context/contract'
import { sidebar } from '@sand/sidebar/contract'
import { span } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { botKind, botReplyEntry, type BotReplyEntry } from '../contract'
import { replyCard } from './card'
import { inject } from './context'
import { botFace } from './face'
import { projectSection } from './project'
import { createRoster } from './roster'
import { botTrigger } from './trigger'

const botOf = (data: Record<string, unknown>) => (typeof data.id === 'string' ? data.id : undefined)

export default definePlugin({
  name: 'bot-bridge-web',
  description: "Lets @ in the composer hand a message to a bot, shows its reply as a card in the thread, marks threads a bot started, and picks the project a bot's threads start in",
  inject,
  apply(ctx) {
    const roster = createRoster(ctx)
    const project = projectSection(ctx, roster)
    ctx.watch(botProfile, found => found?.section({ id: 'project', order: 5, render: project }))
    ctx.watch(composer, found => found?.trigger(botTrigger(roster), 5))
    ctx.watch(contextChips, found =>
      found?.register({
        kind: botKind,
        title: 'Bot',
        icon: 'bot',
        lead(record) {
          const bot = botOf(record.data)
          return bot ? botFace(ctx, roster, bot, 14) : null
        },
        action: {
          label: 'Open in Bots',
          run(record) {
            const bot = botOf(record.data)
            if (bot) ctx.get(botViews)?.open(bot)
          },
        },
      }),
    )
    ctx.watch(transcript, found => found?.entry(botReplyEntry, entry => replyCard(ctx, roster, entry.data as BotReplyEntry)))
    ctx.watch(sidebar, found =>
      found?.decorate({
        id: 'bot-started',
        order: 20,
        meta(thread) {
          const bot = roster.starterOf(thread.id)
          return bot ? span({ class: 'truncate text-neutral-500' }, `Started by ${bot.name}`) : null
        },
      }),
    )
  },
})
