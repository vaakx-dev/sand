import type { ContextRecord } from '@sand/chats/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Threads } from '@sand/web-client/contract'
import type { ChipKind } from '../contract'
import { field } from './field'

const text = (record: ContextRecord, key: string) => {
  const value = record.data[key]
  return typeof value === 'string' ? value : undefined
}

export const fallbackChip = (kind: string): ChipKind => ({ kind, title: kind, icon: 'link' })

export const fileChip: ChipKind = {
  kind: 'file',
  title: 'File',
  icon: 'file',
  details: record => {
    const path = text(record, 'path')
    return path ? field('Path', path) : null
  },
}

export const threadChip = ({ sheetText }: Kit, threads: Threads): ChipKind => ({
  kind: 'thread',
  title: 'Thread',
  icon: 'message',
  details: record => {
    const id = text(record, 'id')
    const info = id ? threads.get(id)?.info : undefined
    if (!info) return sheetText('This thread isn’t in your list on this page.')
    return [info.title !== record.label && field('Now titled', info.title), field('Folder', info.cwd)]
  },
  action: {
    label: 'Open thread',
    run: record => {
      const id = text(record, 'id')
      if (id) void threads.select(id)
    },
  },
})
