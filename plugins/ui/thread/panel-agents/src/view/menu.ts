import type { MenuSpec, NavAction } from '@sand/dom'
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
  if (session) items.push({ id: 'copy-id', label: 'Copy thread id', icon: 'copy', group: 'copy', tile: true, run: () => actions.copy(session, 'thread id') })
  return { title: title || 'Agent', actions: items }
}
