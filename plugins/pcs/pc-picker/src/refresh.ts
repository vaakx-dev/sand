import type { ProjectGroup } from '@sand/web-client/contract'
import { currentTarget, isOnline, refOf, type PickerContext } from './target'

export const refreshGroup = (ctx: PickerContext, group?: ProjectGroup) => {
  if (!group || !ctx.sync) return
  for (const entry of group.locations) {
    if (isOnline(ctx, entry.device)) void ctx.sync.refresh(refOf(entry)).catch(() => undefined)
  }
}

const groupKey = (ctx: PickerContext) => {
  const { cwd, device, group } = currentTarget(ctx)
  const places = group?.locations.map(entry => `${entry.device ?? ''}:${entry.path}:${isOnline(ctx, entry.device)}`) ?? []
  return [cwd, device ?? '', ...places].join('|')
}

export const refreshOnProjectChange = (ctx: PickerContext) => {
  let last = ''
  const check = () => {
    const key = groupKey(ctx)
    if (key === last) return
    last = key
    refreshGroup(ctx, currentTarget(ctx).group)
  }
  for (const name of ['thread.select', 'threads.change', 'projects.change', 'machines.change'] as const) ctx.on(name, check)
  check()
}
