import type { PickAction, PickOptions } from '@sand/protocol'

export type Sort = 'threaded' | 'recent' | 'relevance'

export interface View {
  all: boolean
  sort: Sort
  named: boolean
  ids: boolean
  query: string
  selected?: string
  hint?: string
}

const sorts: Sort[] = ['threaded', 'recent', 'relevance']

const sortNames: Record<Sort, string> = { threaded: 'Threaded', recent: 'Recent', relevance: 'Fuzzy' }

export const fresh: View = { all: false, sort: 'threaded', named: false, ids: false, query: '' }

export const nextSort = (sort: Sort) => sorts[(sorts.indexOf(sort) + 1) % sorts.length]!

export const title = 'Resume thread'

const actions = (view: View): PickAction[] => [
  { id: 'scope', label: 'scope' },
  { id: 'sort', label: 'sort' },
  { id: 'named', label: 'named' },
  { id: 'ids', label: `id (${view.ids ? 'on' : 'off'})` },
  { id: 'rename', label: 'Rename', row: true },
  { id: 'delete', label: 'Delete', row: true, danger: true },
]

const status = (view: View) =>
  [
    view.all ? '○ Current folder  ◉ All' : '◉ Current folder  ○ All',
    `Name: ${view.named ? 'Named' : 'All'}`,
    `Sort: ${sortNames[view.sort]}`,
  ].join(' · ')

const empty = (view: View) => {
  if (view.named) return view.all ? 'No named threads found' : 'No named threads in this folder'
  return view.all ? 'No threads found' : 'No threads in this folder'
}

export const options = (view: View, selected: number): PickOptions => ({
  status: status(view),
  actions: actions(view),
  hint: view.hint,
  query: view.query,
  selected,
  rank: view.sort !== 'recent',
  empty: empty(view),
})
