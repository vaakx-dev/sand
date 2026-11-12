import type { ContextRecord } from '@sand/chats/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Threads } from '@sand/web-client/contract'
import type { ChipKind } from '../contract'
import { valueText } from './value'

const text = (record: ContextRecord, key: string) => {
  const value = record.data[key]
  return typeof value === 'string' ? value : undefined
}

export const fallbackChip = (kind: string): ChipKind => ({ kind, title: kind, icon: 'link' })

export const fileChip = ({ field }: Kit): ChipKind => ({
  kind: 'file',
  title: 'File',
  icon: 'file',
  details: record => {
    const path = text(record, 'path')
    return path ? field({ label: 'Path' }, valueText(path)) : null
  },
})

export const threadChip = ({ field, sheetText }: Kit, threads: Threads, open: (thread: string) => void): ChipKind => ({
  kind: 'thread',
  title: 'Thread',
  icon: 'message',
  details: record => {
    const id = text(record, 'id')
    const info = id ? threads.get(id)?.info : undefined
    if (!info) return sheetText('This thread isn’t in your list on this page.')
    return [info.title !== record.label && field({ label: 'Now titled' }, valueText(info.title)), field({ label: 'Folder' }, valueText(info.cwd))]
  },
  action: {
    label: 'Open thread',
    run: record => {
      const id = text(record, 'id')
      if (id) open(id)
    },
  },
})
