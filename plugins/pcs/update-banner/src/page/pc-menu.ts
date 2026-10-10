import type { MenuSpec, NavAction } from '@sand/dom'
import type { Fleet, PcView } from '../fleet/model'
import { versionText } from '../fleet/text'

const actionFor = (pc: PcView, fleet: Fleet, kind: string): NavAction | undefined => {
  const key = pc.key
  switch (kind) {
    case 'behind':
      return { id: 'update', label: 'Update', icon: 'up', run: () => fleet.update([key]) }
    case 'failed':
      return { id: 'retry', label: 'Try again', icon: 'retry', run: () => fleet.retry(key) }
    case 'restart':
      return { id: 'restart', label: 'Restart now', icon: 'reload', run: () => fleet.restartNow(key) }
    default:
      return undefined
  }
}

export const pcMenu = (pc: PcView, fleet: Fleet, kind: string): MenuSpec => {
  const found = actionFor(pc, fleet, kind)
  return { title: pc.name, subtitle: versionText(pc.state?.current, fleet.target.get()) || undefined, actions: found ? [found] : [] }
}
