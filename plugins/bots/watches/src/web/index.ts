import { transcript } from '@sand/transcript/contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'bot-watches-web',
  description: 'An eye on the wakes a watch brings into a bot chat',
  apply(ctx) {
    ctx.watch(transcript, found => found?.notice('watch', { icon: 'eye' }))
  },
})
