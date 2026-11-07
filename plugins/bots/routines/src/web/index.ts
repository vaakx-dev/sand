import { botProfile } from '@sand/bots/contract'
import { wire } from '@sand/devices-contract'
import { transcript } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { routinesSection } from './section'

export default definePlugin({
  name: 'routines-web',
  description: "The Routines section of a bot's profile, with each routine's timing, pause and delete, and a clock on its wakes in the chat",
  inject: { kit, wire },
  apply(ctx) {
    ctx.watch(botProfile, found => found?.section({ id: 'routines', order: 10, render: bot => routinesSection(ctx, bot) }))
    ctx.watch(transcript, found => found?.notice('routine', { icon: 'clock' }))
  },
})
