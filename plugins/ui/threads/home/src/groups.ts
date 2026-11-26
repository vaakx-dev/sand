import type { GroupAction, ShellGroup, ShellRow } from '@sand/ui-shell/contract'

export interface ListEntry {
  row: ShellRow
  moved: number
  talked: number
  snoozed?: number
  archived?: boolean
  pinned?: boolean
}

export interface ListGroupsInput {
  id: string
  label: string
  entries: ListEntry[]
  settleDays: number | undefined
  now: number
  action?: GroupAction
  empty?: string
  archived?: { limit: number; more(): void }
}

const DAY_MS = 86_400_000

export const pageSize = 50

const newest = (entries: ListEntry[]) => entries.toSorted((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.moved - a.moved)

const group = (id: string, label: string, entries: ListEntry[], extra?: Partial<ShellGroup>): ShellGroup[] =>
  entries.length ? [{ id, label, rows: entries.map(entry => entry.row), ...extra }] : []

export const settles = (entry: Pick<ListEntry, 'row' | 'talked' | 'pinned'>, days: number | undefined, now: number) =>
  days !== undefined && !entry.pinned && !entry.row.status && now - entry.talked > days * DAY_MS

const archivedGroup = (entries: ListEntry[], { limit, more }: NonNullable<ListGroupsInput['archived']>) => {
  const hidden = entries.length - limit
  return group('archived', 'Archived', entries.slice(0, limit), {
    fold: 'closed',
    ...(hidden > 0 && { action: { label: `Show ${Math.min(hidden, pageSize)} more`, icon: 'down', run: more } }),
  })
}

export const listGroups = ({ id, label, entries, settleDays, now, action, empty, archived }: ListGroupsInput): ShellGroup[] => {
  const gone = newest(entries.filter(entry => entry.archived))
  const snoozed = newest(entries.filter(entry => entry.snoozed && !entry.archived))
  const open = entries.filter(entry => !entry.snoozed && !entry.archived)
  const working = newest(open.filter(entry => entry.row.status === 'running'))
  const rest = open.filter(entry => entry.row.status !== 'running')
  const settled = newest(rest.filter(entry => settles(entry, settleDays, now)))
  const active = newest(rest.filter(entry => !settles(entry, settleDays, now)))
  return [
    { id, label, rows: active.map(entry => entry.row), ...(action && { action }), ...(!entries.length && empty !== undefined && { empty }) },
    ...group('working', 'Working', working),
    ...group('snoozed', 'Snoozed', snoozed, { fold: 'closed' }),
    ...group('settled', 'Settled', settled.map(entry => ({ ...entry, row: { ...entry.row, quiet: true } })), { settled: true }),
    ...(archived ? archivedGroup(gone, archived) : []),
  ]
}
