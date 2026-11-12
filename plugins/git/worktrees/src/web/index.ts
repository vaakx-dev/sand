import { wire } from '@sand/devices-contract'
import { threadRows } from '@sand/threads-home/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { branchPart } from './branch'

export default definePlugin({
  name: 'worktrees',
  description: "Shows the branch of a thread in its own worktree on its row",
  inject: { wire, threads, kit },
  apply(ctx) {
    const branch = branchPart(ctx, ctx.kit, ctx.wire, ctx.threads)
    ctx.watch(threadRows, rows => rows?.part(branch))
  },
})
