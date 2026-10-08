import type { ProjectEntry } from '@sand/protocol'
import { refOf, currentTarget, isOnline, locationOn, type PickerContext } from '../target'

export interface SendBack {
  from: ProjectEntry
  to: ProjectEntry
}

export const sendBackFor = (ctx: PickerContext, armed: string | undefined): SendBack | undefined => {
  const { thread, group, device } = currentTarget(ctx)
  if (!ctx.sync || !thread || thread.id !== armed || !group || group.locations.length < 2) return undefined
  const from = locationOn(group, device)
  if (!from) return undefined
  const to = group.locations.find(
    entry => entry.device !== from.device && isOnline(ctx, entry.device) && ctx.sync?.relation(refOf(from), refOf(entry)) === 'ahead',
  )
  return to && { from, to }
}

export const sendBackKey = (found: SendBack | undefined) =>
  found ? `${found.from.device ?? ''}:${found.from.path}>${found.to.device ?? ''}:${found.to.path}` : ''
