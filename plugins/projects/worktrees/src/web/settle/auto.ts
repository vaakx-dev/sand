import type { SettleResult } from '../../contract'
import { errorMessage } from '@sand/dom'
import { plural } from '@sand/kit'
import type {} from '@sand/github/contract'
import type { Thread } from '@sand/web-client/contract'
import type { WebContext, WorktreeClient } from '../client'
import type { Marks } from '../marks'

const kept = (result: Exclude<SettleResult, { settled: true }>) => {
  if (result.reason === 'changed') return `it has ${plural(result.changed ?? 0, 'uncommitted change')}`
  return `it has ${plural(result.ahead ?? 0, 'commit')} that ${result.ahead === 1 ? "isn't" : "aren't"} pushed`
}

const removeAnyway = (ctx: WebContext, client: WorktreeClient, thread: Thread) => async () => {
  try {
    const result = await client.remove(thread.id, true)
    if (result.settled) await ctx.threads.settle(thread.id, true)
  } catch (error) {
    ctx.notify?.push(`Could not remove the worktree: ${errorMessage(error)}`, { level: 'error' })
  }
}

const settle = async (ctx: WebContext, client: WorktreeClient, thread: Thread, branch: string, pr?: number) => {
  const result = await client.settle(thread.id, branch, pr)
  const name = pr ? `PR #${pr}` : `The PR for ${branch}`
  if (result.settled) {
    await ctx.threads.settle(thread.id, true)
    return ctx.notify?.push(`${name} was merged, so its worktree was removed and the thread settled. Restore brings both back.`)
  }
  if (result.reason !== 'changed' && result.reason !== 'unpushed') return
  ctx.notify?.push(`${name} was merged, but its worktree was kept because ${kept(result)}.`, {
    timeout: 30_000,
    action: { label: 'Remove anyway', run: () => void removeAnyway(ctx, client, thread)() },
  })
}

export const autoSettle = (ctx: WebContext, client: WorktreeClient, marks: Marks) => {
  const tried = new Set<string>()
  return ctx.watch('pulls', pulls => {
    if (!pulls) return
    const check = () => {
      for (const thread of ctx.threads.list()) {
        if (thread.info.kind === 'agent' || thread.info.settled || thread.running) continue
        const branch = marks.of(thread.info.cwd, thread.device)?.branch
        if (!branch) continue
        const pr = pulls.of(thread.info.cwd, thread.device)
        const key = `${thread.id}\0${branch}`
        if (pr?.state !== 'merged' || pr.branch !== branch || tried.has(key)) continue
        tried.add(key)
        void settle(ctx, client, thread, branch, pr.number).catch(error => ctx.notify?.push(`Could not clean up ${branch}: ${errorMessage(error)}`, { level: 'error' }))
      }
    }
    const stop = [ctx.on('pulls.change', check), ctx.on('worktrees.change', check)]
    check()
    return () => stop.forEach(dispose => void dispose())
  })
}
