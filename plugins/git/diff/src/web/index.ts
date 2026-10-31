import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { gitDiff, gitDiffClient, gitPatch } from '../contract'

export default definePlugin({
  name: 'git-diff',
  description: "Reads git diffs for the page: a thread folder's changed files and each file's patch, from the PC that holds it",
  inject: { wire },
  apply(ctx) {
    ctx.provide(gitDiffClient, {
      diff: (input, device) => ctx.wire.call(gitDiff, input, device),
      patch: (input, device) => ctx.wire.call(gitPatch, input, device),
    })
  },
})
