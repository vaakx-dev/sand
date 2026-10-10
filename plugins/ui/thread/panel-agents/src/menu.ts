import type { MenuSpec, NavAction } from '@sand/dom'
import type { Actions } from './parts'

export interface MenuTarget {
  title: string
  session?: string
  stop?: () => Promise<boolean>
}

export const agentMenu = (actions: Actions, { title, session, stop }: MenuTarget): MenuSpec => {
  const items: (NavAction | false)[] = [
    Boolean(session) && { id: 'open', label: 'Open thread', icon: 'external', group: 'open', run: () => actions.open(session ?? '') },
    Boolean(stop) && { id: 'stop', label: 'Stop', icon: 'stop', group: 'stop', danger: true, run: () => void stop?.() },
    Boolean(session) && { id: 'copy-id', label: 'Copy thread id', icon: 'copy', group: 'copy', run: () => actions.copy(session ?? '', 'thread id') },
  ]
  return { title: title || 'Agent', actions: items.filter(item => item !== false) }
}
