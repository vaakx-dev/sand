import type { ShellGroup } from '@sand/ui-shell/contract'
import type { Entry } from './items/items'

export const pageSize = 50

const group = (id: string, label: string, entries: Entry[]): ShellGroup[] => (entries.length ? [{ id, label, rows: entries.map(entry => entry.row) }] : [])

export const threadGroups = (entries: Entry[], limit: number, more: () => void): ShellGroup[] => {
  const pinned = entries.filter(entry => entry.pinned && !entry.snoozed)
  const recent = entries.filter(entry => !entry.pinned && !entry.snoozed).sort((a, b) => b.moved - a.moved)
  const snoozed = entries.filter(entry => entry.snoozed).sort((a, b) => (a.snoozed ?? 0) - (b.snoozed ?? 0))
  const hidden = recent.length - limit
  return [
    ...group('pinned', 'Pinned', pinned),
    ...group('recent', 'Chats', recent.slice(0, limit)),
    ...(hidden > 0 ? [{ id: 'older', label: `${hidden} older`, action: { label: 'Show more', icon: 'down', run: more }, rows: [] }] : []),
    ...group('snoozed', 'Snoozed', snoozed),
  ]
}
