import type { NavAction } from '@sand/nav/contract'
import type { MenuSpec } from '@sand/ui-kit/contract'
import type { Actions } from './parts'

export interface MenuTarget {
  title: string
  session?: string
  stop?: () => Promise<boolean>
}

export const agentMenu = (actions: Actions, { title, session, stop }: MenuTarget): MenuSpec => {
  const items: NavAction[] = []
  if (session) items.push({ id: 'open', label: 'Open thread', icon: 'external', group: 'open', tile: true, run: () => actions.open(session) })
  if (stop) items.push({ id: 'stop', label: 'Stop', icon: 'stop', group: 'stop', danger: true, tile: true, run: () => void stop() })
  if (session) items.push({ id: 'copy-id', label: 'Copy thread id', icon: 'copy', group: 'copy', tile: true, run: () => actions.copy(session) })
  return { title: title || 'Agent', actions: items }
}
