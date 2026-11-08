import type { Wire } from '@sand/devices-contract'
import { folderFacts, type RowPart } from '@sand/threads-home/contract'
import type { Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { worktreesChange, worktreesList } from '../contract'

const samePath = (a: string, b: string) => a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase()

export const branchPart = (ctx: Context, wire: Wire, threads: Threads): RowPart => {
  const branches = folderFacts(ctx, threads, async ({ cwd, device }) => {
    const list = await wire.call(worktreesList, { cwd }, device)
    return list.find(worktree => samePath(worktree.path, cwd))?.branch
  })
  ctx.effect(() => wire.on(worktreesChange, branches.reload, { from: 'all' }))
  return { id: 'branch', order: 10, render: thread => () => branches.get(thread) ?? '' }
}
