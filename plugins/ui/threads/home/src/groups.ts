import type { ShellGroup } from '@sand/ui-shell/contract'
import type { Entry } from './items/items'

export const pageSize = 50

const day = 24 * 60 * 60 * 1000

const dayLabel = (at: number) => {
  const date = new Date(at)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === new Date(today.getTime() - day).toDateString()) return 'Yesterday'
  const year = date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year })
}

const byDay = (entries: Entry[]): ShellGroup[] => {
  const groups: ShellGroup[] = []
  for (const entry of entries) {
    const label = dayLabel(entry.moved)
    const last = groups.at(-1)
    if (last?.label === label) last.rows.push(entry.row)
    else groups.push({ id: `day:${label}`, label, rows: [entry.row] })
  }
  return groups
}

const group = (id: string, label: string, entries: Entry[]): ShellGroup[] => (entries.length ? [{ id, label, rows: entries.map(entry => entry.row) }] : [])

export const threadGroups = (entries: Entry[], limit: number, more: () => void): ShellGroup[] => {
  const pinned = entries.filter(entry => entry.pinned && !entry.snoozed)
  const recent = entries.filter(entry => !entry.pinned && !entry.snoozed).sort((a, b) => b.moved - a.moved)
  const snoozed = entries.filter(entry => entry.snoozed).sort((a, b) => (a.snoozed ?? 0) - (b.snoozed ?? 0))
  const hidden = recent.length - limit
  return [
    ...group('pinned', 'Pinned', pinned),
    ...byDay(recent.slice(0, limit)),
    ...(hidden > 0 ? [{ id: 'older', label: `${hidden} older`, action: { label: 'Show more', icon: 'down', run: more }, rows: [] }] : []),
    ...group('snoozed', 'Snoozed', snoozed),
  ]
}
