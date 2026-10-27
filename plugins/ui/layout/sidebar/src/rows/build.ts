import type { ThreadItem } from '../items/item'

export type HeadRow = { kind: 'head'; key: string; name: string; count: number; open: boolean }
export type CardRow = { kind: 'card'; key: string; group: string; item: ThreadItem; selected: boolean }
export type MoreRow = { kind: 'more'; key: string; section: string; hidden: number }
export type Row = HeadRow | CardRow | MoreRow

export interface RowOptions {
  project?: string
  selected?: string
  isOpen(key: string, fallback: boolean): boolean
  limit(key: string): number
}

export const pageSize = 25

export const pageStep = pageSize * 2

const backFirst = (items: ThreadItem[]) => [...items.filter(item => item.back), ...items.filter(item => !item.back)]

const bySnooze = (a: ThreadItem, b: ThreadItem) => (a.snoozed ?? 0) - (b.snoozed ?? 0)

const folded = new Set(['Snoozed', 'Settled'])

export const openByDefault = (name: string) => !folded.has(name)

const sections = (items: ThreadItem[]): [string, ThreadItem[]][] => {
  const awake = items.filter(item => !item.snoozed)
  return [
    ['Pinned', backFirst(awake.filter(item => item.pinned && !item.settled))],
    ['Active', backFirst(awake.filter(item => !item.pinned && !item.settled))],
    ['Snoozed', items.filter(item => item.snoozed).sort(bySnooze)],
    ['Settled', awake.filter(item => item.settled)],
  ]
}

export const cardsIn = (rows: Row[], group: string) => rows.filter((row): row is CardRow => row.kind === 'card' && row.group === group)

const sectionRows = (name: string, items: ThreadItem[], options: RowOptions): Row[] => {
  const key = `sessions:${name}`
  const open = options.isOpen(key, openByDefault(name))
  const head: HeadRow = { kind: 'head', key, name, count: items.length, open }
  if (!open) return [head]
  const limit = options.limit(key)
  const shown = items.filter((item, index) => index < limit || item.id === options.selected)
  const cards = shown.map((item): CardRow => ({ kind: 'card', key: `sessions:${item.id}`, group: key, item, selected: item.id === options.selected }))
  const hidden = items.length - shown.length
  if (hidden <= 0) return [head, ...cards]
  return [head, ...cards, { kind: 'more', key: `${key}:more`, section: key, hidden }]
}

export const buildRows = (items: ThreadItem[], options: RowOptions): Row[] => {
  const shown = items.filter(item => !options.project || item.projectKey === options.project)
  return sections(shown)
    .filter(([, found]) => found.length)
    .flatMap(([name, found]) => sectionRows(name, found, options))
}
