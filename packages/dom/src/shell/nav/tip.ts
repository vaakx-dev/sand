import type { NavItem } from '@sand/protocol'
import { tildeHome } from '@sand/kit'

const marks: Partial<Record<NavItem['state'], string>> = { running: 'Working', background: 'Background agents running', waiting: 'Needs you', draft: 'Draft' }

export const navStatus = (item: NavItem) => marks[item.state] ?? (item.unread ? 'New since you last looked' : '')

export const navTip = (item: NavItem) =>
  [item.title, [item.path ? tildeHome(item.path) : item.project, navStatus(item)].filter(Boolean).join(' · ')].filter(Boolean).join('\n')
