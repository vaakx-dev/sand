import { botAutomations, type BotAutomation } from '@sand/bots/contract'
import { wire } from '@sand/devices-contract'
import { transcript } from '@sand/transcript/contract'
import { definePlugin } from 'drydock'
import { botWatchRemove, type BotWatch } from '../contract'
import { createWatches } from './store'

export default definePlugin({
  name: 'bot-watches-web',
  description: "Each bot's watches, with what they follow and a way to stop them, for the bots UI's automations, and an eye on their wakes in the chat",
  inject: { wire },
  apply(ctx) {
    const watches = createWatches(ctx)
    const automation = (watch: BotWatch): BotAutomation => ({
      id: watch.id,
      icon: 'eye',
      title: watch.label,
      when: 'On changes',
      detail: `${watch.kindLabel}: ${watch.target}`,
      ...(watch.job && { job: watch.job }),
      error: watch.error,
      actions: () => [
        {
          id: 'remove',
          label: 'Stop watching',
          icon: 'trash',
          danger: true,
          confirm: 'Stop watching this?',
          run: () => ctx.wire.call(botWatchRemove, { watch: watch.id }),
        },
      ],
    })
    ctx.watch(botAutomations, found => found?.source({ id: 'watches', order: 20, list: bot => watches(bot).map(automation) }))
    ctx.watch(transcript, found => found?.notice('watch', { icon: 'eye' }))
  },
})
