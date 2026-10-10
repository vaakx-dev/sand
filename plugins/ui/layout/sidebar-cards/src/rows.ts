import type { NavItem, NavList } from '@sand/dom'
import { inProject } from './project-choices'

export type Row =
  | { kind: 'head'; key: string; list: NavList; name: string; count: number; open: boolean }
  | { kind: 'card'; key: string; group: string; list: NavList; item: NavItem; selected: boolean }
  | { kind: 'more'; key: string; list: NavList; section: string; hidden: number }

export interface RowOptions {
  project?: string
  isOpen(key: string, fallback: boolean): boolean
  limit(key: string): number
}

const backFirst = (items: NavItem[]) => [...items.filter(item => item.back), ...items.filter(item => !item.back)]

const bySnooze = (a: NavItem, b: NavItem) => (a.snoozed ?? 0) - (b.snoozed ?? 0)

const folded = new Set(['Snoozed', 'Settled'])

export const openByDefault = (name: string) => !folded.has(name)

const sections = (items: NavItem[]): [string, NavItem[]][] => {
  const awake = items.filter(item => !item.snoozed)
  return [
    ['Pinned', backFirst(awake.filter(item => item.pinned && !item.settled))],
    ['Active', backFirst(awake.filter(item => !item.pinned && !item.settled))],
    ['Snoozed', items.filter(item => item.snoozed).sort(bySnooze)],
    ['Settled', awake.filter(item => item.settled)],
  ]
}

export const cardsIn = (rows: Row[], group: string) =>
  rows.filter((row): row is Extract<Row, { kind: 'card' }> => row.kind === 'card' && row.group === group)

export const buildRows = (lists: NavList[], options: RowOptions): Row[] =>
  lists.flatMap(list => {
    const selected = list.selected?.()
    const items = list.items().filter(item => !options.project || inProject(item, options.project))
    return sections(items)
      .filter(([, items]) => items.length)
      .flatMap(([name, items]): Row[] => {
        const key = `${list.id}:${name}`
        const open = options.isOpen(key, openByDefault(name))
        const head: Row = { kind: 'head', key, list, name, count: items.length, open }
        if (!open) return [head]
        const limit = options.limit(key)
        const shown = items.filter((item, index) => index < limit || item.id === selected)
        const rows = shown.map(
          (item): Row => ({ kind: 'card', key: `${list.id}:${item.id}`, group: key, list, item, selected: item.id === selected }),
        )
        const hidden = items.length - shown.length
        return [head, ...rows, ...(hidden > 0 ? [{ kind: 'more', key: `${key}:more`, list, section: key, hidden } as Row] : [])]
      })
  })
