import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { gitActionsClient, gitCommit, gitInit, gitMessage, gitProgress, gitPull, gitPush, gitSwitch } from '../contract'

export default definePlugin({
  name: 'git-actions',
  description: "Runs git actions for the page: commits, pushes, pulls, switches branches and starts repositories on the PC that holds the folder, with their progress",
  inject: { wire },
  apply(ctx) {
    ctx.provide(gitActionsClient, {
      commit: (input, device) => ctx.wire.call(gitCommit, input, device),
      message: (input, device) => ctx.wire.call(gitMessage, input, device),
      push: (input, device) => ctx.wire.call(gitPush, input, device),
      pull: (input, device) => ctx.wire.call(gitPull, input, device),
      switch: (input, device) => ctx.wire.call(gitSwitch, input, device),
      init: (input, device) => ctx.wire.call(gitInit, input, device),
      onProgress: listener => ctx.wire.on(gitProgress, listener, { from: 'all' }),
    })
  },
})
