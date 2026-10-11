import type { SyncFlows } from '../../contract'
import { reportError, type ProjectsContext } from '../../context'
import { devicesPage } from './devices'
import { noCopyPage } from './nocopy'
import { openResolve } from './resolve'
import { sendPage } from './sendReview'

const syncOf = (ctx: ProjectsContext) => {
  const sync = ctx.sync
  if (!sync) ctx.notify?.push('Project sync is not available', { level: 'error' })
  return sync
}

export const createSyncFlows = (ctx: ProjectsContext): SyncFlows => ({
  copy(group, device, then) {
    const machine = ctx.machines.get(device)
    if (!machine?.online) return ctx.notify?.push('That PC is offline', { level: 'error' })
    ctx.palette?.open(noCopyPage(ctx, group, machine, then))
  },
  add: group => ctx.palette?.open(devicesPage(ctx, group, machine => noCopyPage(ctx, group, machine))),
  send(from, to) {
    const sync = syncOf(ctx)
    if (!sync) return
    Promise.all([sync.refresh(from), sync.refresh(to)]).then(
      () => ctx.palette?.open(sendPage(ctx, sync, from, to)),
      error => reportError(ctx, error),
    )
  },
  resolve(ref) {
    const sync = syncOf(ctx)
    if (sync) openResolve(ctx, sync, ref)
  },
})
