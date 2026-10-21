import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import type { ThreadItem } from '../items/item'

const skyMark = ({ icon }: Kit, name: 'pencil' | 'bot') => span({ class: 'inline-flex shrink-0 text-sky-400' }, icon(name, 12))

export const draftMark = (kit: Kit) => skyMark(kit, 'pencil')

export const agentMark = (kit: Kit) => skyMark(kit, 'bot')

export const itemMark = (kit: Kit, item: ThreadItem, size = 14) => {
  if (item.state === 'draft') return draftMark(kit)
  if (item.state === 'running') return kit.working(size)
  if (item.state === 'background') return agentMark(kit)
  if (item.unread) return kit.dot('orange')
  return null
}

const agentsLabel = (count = 0) => (count === 1 ? '1 agent' : `${count} agents`)

export const itemStatus = (item: ThreadItem) => {
  if (item.state === 'background') return `${agentsLabel(item.agents)} running in the background`
  if (item.state === 'running') return item.agents ? `Working, with ${agentsLabel(item.agents)} running` : 'Working'
  if (item.state === 'draft') return 'Draft'
  return item.unread ? 'New since you last looked' : ''
}

export const agentCount = (item: ThreadItem) => (item.agents ? agentsLabel(item.agents) : '')
