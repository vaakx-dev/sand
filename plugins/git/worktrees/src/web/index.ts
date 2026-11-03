import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import {
  worktreesChange,
  worktreesClient,
  worktreesDefaults,
  worktreesGlobal,
  worktreesList,
  worktreesMove,
  worktreesProgress,
  worktreesRemove,
  worktreesRestore,
  worktreesSetup,
  worktreesSizes,
  worktreesStatus,
  worktreesThread,
} from '../contract'

export default definePlugin({
  name: 'worktrees',
  description: "Reaches thread worktrees for the page: lists, creates, moves into, removes, restores, sizes and sets them up on the PC that holds the repo, with their progress",
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
      global: input => ctx.wire.call(worktreesGlobal, input),
      status: device => ctx.wire.call(worktreesStatus, {}, device),
      sizes: device => ctx.wire.call(worktreesSizes, {}, device),
      onProgress: listener => ctx.wire.on(worktreesProgress, listener, { from: 'all' }),
      onChange: listener => ctx.wire.on(worktreesChange, listener, { from: 'all' }),
    })
  },
})
