import { botWork } from '@sand/bot-work/contract'
import { transcript } from '@sand/transcript/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { listeningSection } from './section'
import { createWatchStore } from './store'

export default definePlugin({
  name: 'bot-watches-web',
  description: "The Listening section at the top of a bot's Work tab: each thing the bot listens to, when it last changed or its error, and a button to remove it",
  inject,
  apply(ctx) {
    const watchesOf = createWatchStore(ctx)
    ctx.watch(botWork, found =>
      found?.section({
        id: 'listening',
        order: -10,
        has: bot => watchesOf(bot).get().length > 0,
        render: bot => listeningSection(ctx, watchesOf(bot)),
      }),
    )
    ctx.watch(transcript, found => found?.notice('watch', { icon: 'eye' }))
  },
})
