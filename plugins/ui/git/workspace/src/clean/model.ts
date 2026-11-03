import { picker } from '@sand/picker/contract'
import { errorMessage, folderName } from '@sand/util'
import { unsaved, type WorktreeStatus } from '@sand/worktrees/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'

export const nameOf = (status: WorktreeStatus) => status.branch ?? folderName(status.path)

const finished = (status: WorktreeStatus) => status.pull?.state === 'merged' || status.ahead === 0

const preselected = (status: WorktreeStatus) => !status.check.running && !unsaved(status.check) && finished(status)

const confirmLoss = async (ctx: WorkspaceContext, status: WorktreeStatus) => {
  const picked = await ctx.get(picker)?.choose(`Removing ${nameOf(status)} loses ${unsaved(status.check)}.`, [
    { label: 'Remove it anyway', tone: 'error', value: true },
    { label: 'Keep it', value: false },
  ])
  return picked?.value === true
}

export const createCleanup = (ctx: WorkspaceContext, device: string) => {
  const statuses = sig<WorktreeStatus[] | undefined>(undefined)
  const sizes = sig<Record<string, number>>({})
  const failed = sig('')
  const chosen = sig<ReadonlySet<string>>(new Set())
  const removing = sig(false)

  const sizeOf = (status: WorktreeStatus) => sizes.get()[status.path]
  const rows = derive(() => [...(statuses.get() ?? [])].sort((a, b) => (sizeOf(b) ?? -1) - (sizeOf(a) ?? -1)))
  const picked = derive(() => rows.get().filter(status => chosen.get().has(status.path)))
  const freed = derive(() => picked.get().reduce((total, status) => total + (sizeOf(status) ?? 0), 0))

  ctx.worktrees.status(device).then(
    list => {
      chosen.set(new Set(list.filter(preselected).map(status => status.path)))
      statuses.set(list)
    },
    error => failed.set(errorMessage(error)),
  )
  ctx.worktrees.sizes(device).then(
    found => sizes.set(found),
    error => ctx.report(error),
  )

  const set = (path: string, on: boolean) => {
    const next = new Set(chosen.get())
    if (on) next.add(path)
    else next.delete(path)
    chosen.set(next)
  }

  const toggle = async (status: WorktreeStatus) => {
    if (chosen.get().has(status.path)) return set(status.path, false)
    if (!unsaved(status.check) || (await confirmLoss(ctx, status))) set(status.path, true)
  }

  const removeOne = async (status: WorktreeStatus) => {
    const result = await ctx.worktrees.remove({ path: status.path, force: Boolean(unsaved(status.check)) }, device)
    if (!result.removed) throw new Error(result.message)
  }

  const removePicked = async () => {
    removing.set(true)
    const problems = await Promise.all(
      picked.get().map(status =>
        removeOne(status).then(
          () => '',
          error => `${nameOf(status)}: ${errorMessage(error)}`,
        ),
      ),
    )
    removing.set(false)
    return problems.filter(Boolean)
  }

  return { statuses, rows, failed, chosen, removing, picked, freed, sizeOf, toggle, removePicked }
}

export type Cleanup = ReturnType<typeof createCleanup>
