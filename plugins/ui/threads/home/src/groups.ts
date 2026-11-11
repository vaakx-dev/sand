import type { ShellGroup } from '@sand/ui-shell/contract'
import type { Entry } from './items/items'

export const pageSize = 50

const newest = (entries: Entry[]) => entries.toSorted((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.moved - a.moved)

const group = (id: string, label: string, entries: Entry[], extra?: Partial<ShellGroup>): ShellGroup[] =>
  entries.length ? [{ id, label, rows: entries.map(entry => entry.row), ...extra }] : []

export const threadGroups = (entries: Entry[], limit: number, more: () => void, start: () => void): ShellGroup[] => {
  const settled = newest(entries.filter(entry => entry.settled))
  const snoozed = newest(entries.filter(entry => entry.snoozed && !entry.settled))
  const open = entries.filter(entry => !entry.snoozed && !entry.settled)
  const working = newest(open.filter(entry => entry.row.status === 'running'))
  const active = newest(open.filter(entry => entry.row.status !== 'running'))
  const hidden = settled.length - limit
  return [
    { id: 'active', label: 'Threads', action: { label: 'New thread', icon: 'plus', run: start }, rows: active.map(entry => entry.row) },
    ...group('working', 'Working', working, { folded: true }),
    ...group('snoozed', 'Snoozed', snoozed, { folded: true }),
    ...group('settled', 'Settled', settled.slice(0, limit), {
      folded: true,
      ...(hidden > 0 && { action: { label: `Show ${Math.min(hidden, pageSize)} more`, icon: 'down', run: more } }),
    }),
  ]
}
