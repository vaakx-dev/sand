import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import {
  worktreesChange,
  worktreesClient,
  worktreesDefaults,
  worktreesList,
  worktreesMove,
  worktreesProgress,
  worktreesRemove,
  worktreesRestore,
  worktreesSetup,
  worktreesThread,
} from '../contract'

export default definePlugin({
  name: 'worktrees',
  description: "Reaches thread worktrees for the page: lists, creates, moves into, removes, restores and sets them up on the PC that holds the repo, with their progress",
  inject: { wire },
  apply(ctx) {
    ctx.provide(worktreesClient, {
      list: (input, device) => ctx.wire.call(worktreesList, input, device),
      thread: (input, device) => ctx.wire.call(worktreesThread, input, device),
      move: (input, device) => ctx.wire.call(worktreesMove, input, device),
      remove: (input, device) => ctx.wire.call(worktreesRemove, input, device),
      restore: (input, device) => ctx.wire.call(worktreesRestore, input, device),
      setup: (input, device) => ctx.wire.call(worktreesSetup, input, device),
      defaults: (input, device) => ctx.wire.call(worktreesDefaults, input, device),
      onProgress: listener => ctx.wire.on(worktreesProgress, listener, { from: 'all' }),
      onChange: listener => ctx.wire.on(worktreesChange, listener, { from: 'all' }),
    })
  },
})
