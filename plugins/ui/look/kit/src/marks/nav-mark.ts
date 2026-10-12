import type { NavItem } from '@sand/protocol'
import { dot, working } from './marks'
import { stateMark } from './state-marks'

export const navMark = (item: NavItem, size = 14) => {
  if (item.state === 'draft') return stateMark('draft')
  if (item.state === 'running') return working(size)
  if (item.state === 'background') return stateMark('agent')
  if (item.state === 'waiting') return dot('warning')
  if (item.unread) return stateMark('unread')
  return null
}
