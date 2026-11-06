import { botProfile } from '@sand/bots/contract'
import { wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { routinesSection } from './section'

export default definePlugin({
  name: 'routines-web',
  description: "The Routines section of a bot's profile: each routine with its timing, pause and delete",
  inject: { kit, wire },
  apply(ctx) {
    ctx.watch(botProfile, found => found?.section({ id: 'routines', order: 10, render: bot => routinesSection(ctx, bot) }))
  },
})
