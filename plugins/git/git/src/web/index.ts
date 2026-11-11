import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { gitLive } from '../contract'
import { liveStatus } from './live'

export default definePlugin({
  name: 'git-web',
  description: "Keeps the git status of the folders the page shows up to date, for as long as something reads it",
  inject: { wire },
  apply(ctx) {
    ctx.provide(gitLive, liveStatus(ctx, ctx.wire))
  },
})
