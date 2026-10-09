import type { Item } from '@sand/transcript-parts/contract'
import { div } from '@sand/dom'
import { liveRow } from './live'
import { noticeRow, notificationRow, reportRow } from './notes'
import { textRow, thinkingRow } from './prose'
import { row, type Row, type RowContext } from './row'
import { toolsRow } from './tools'
import { userRow } from './user'

export type { Row, RowContext } from './row'

const customRow = (item: Extract<Item, { kind: 'custom' }>, context: RowContext): Row[] => {
  const render = context.registry.entryRenderer(item.entry.type)
  if (!render) return []
  return [row(`custom:${item.key}`, item, () => render(item.entry, context.thread) ?? div())]
}

export const itemRows = (item: Item, context: RowContext): Row[] => {
  switch (item.kind) {
    case 'user':
      return [userRow(item, context)]
    case 'text':
      return [textRow(item, context)]
    case 'thinking':
      return [thinkingRow(item, context)]
    case 'tools':
      return [toolsRow(item, context)]
    case 'notification':
      return [notificationRow(item, context)]
    case 'report':
      return [reportRow(item, context)]
    case 'notice':
      return [noticeRow(item, context)]
    case 'custom':
      return customRow(item, context)
    case 'live':
      return [liveRow(item, context)]
  }
}
