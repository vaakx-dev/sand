import { wire } from '@sand/devices-contract'
import { threadRows } from '@sand/threads-home/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import {
  worktreesChange,
  worktreesClient,
  worktreesDefaults,
  worktreesGlobal,
  worktreesList,
  worktreesMove,
  worktreesProgress,
  worktreesProposal,
  worktreesProposed,
  worktreesRemove,
  worktreesRestore,
  worktreesSetup,
  worktreesSizes,
  worktreesStatus,
  worktreesThread,
} from '../contract'
import { branchPart } from './branch'

export default definePlugin({
  name: 'worktrees',
  description: "Reaches thread worktrees for the page: lists, creates, moves into, removes, restores, sizes and sets them up on the PC that holds the repo, with their progress; shows each thread's branch on its row",
  inject: { wire, threads, kit },
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
      proposal: (input, device) => ctx.wire.call(worktreesProposal, input, device),
      onProgress: listener => ctx.wire.on(worktreesProgress, listener, { from: 'all' }),
      onProposal: listener => ctx.wire.on(worktreesProposed, listener, { from: 'all' }),
      onChange: listener => ctx.wire.on(worktreesChange, listener, { from: 'all' }),
    })
    const branch = branchPart(ctx, ctx.kit, ctx.wire, ctx.threads)
    ctx.watch(threadRows, rows => rows?.part(branch))
  },
})
