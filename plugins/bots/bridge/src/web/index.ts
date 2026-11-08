import { botTabs, botViews, type BotViews } from '@sand/bots/contract'
import { threadOwners, threadView } from '@sand/chat/contract'
import { composer } from '@sand/composer/contract'
import { contextChips } from '@sand/context/contract'
import { markdownLinks } from '@sand/markdown/contract'
import { transcript } from '@sand/transcript/contract'
import { joinDisposers } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { botKind, botReplyEntry, type BotReplyEntry } from '../contract'
import { replyCard } from './card'
import { inject } from './context'
import { botFace } from './face'
import { threadOwnersOf } from './owners'
import { threadLinks } from './reference'
import { createRoster } from './roster'
import { threadTabs } from './tabs'
import { botTrigger } from './trigger'

const botOf = (data: Record<string, unknown>) => (typeof data.id === 'string' ? data.id : undefined)

export default definePlugin({
  name: 'bot-bridge-web',
  description:
    "Shows bots and threads to each other: a bot's threads open as tabs on its screen and stay out of recent chats, bot chats link threads with their live state, and @ in the composer hands a message to a bot",
  inject,
  apply(ctx) {
    const roster = createRoster(ctx)
    const screens = sig<BotViews | undefined>(undefined)
    ctx.watch(botViews, found => {
      screens.set(found)
      return found && ctx.provide(threadOwners, threadOwnersOf(roster, found))
    })
    ctx.watch(
      threadView,
      view =>
        view &&
        joinDisposers(
          ctx.watch(botTabs, found => found?.source(threadTabs(roster, view))),
          ctx.watch(markdownLinks, found => found?.scheme(threadLinks(ctx.kit, view))),
        ),
    )
    ctx.watch(composer, found => found?.trigger(botTrigger(roster), 5))
    ctx.watch(contextChips, found =>
      found?.register({
        kind: botKind,
        title: 'Bot',
        icon: 'bot',
        lead(record) {
          const bot = botOf(record.data)
          return bot ? botFace(ctx, roster, bot, 16) : null
        },
        action: {
          label: 'Open bot',
          run(record) {
            const bot = botOf(record.data)
            if (bot) screens.get()?.open(bot)
          },
        },
      }),
    )
    ctx.watch(transcript, found => found?.entry(botReplyEntry, entry => replyCard(ctx, roster, screens, entry.data as BotReplyEntry)))
  },
})
