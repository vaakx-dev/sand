import type { PickAction, PickOptions } from '@sand/server/contract'
import { filterNames, filters, type Filter } from '../tree/filter'

export interface TreeView {
  filter: Filter
  query: string
  selected?: string
  hint?: string
}

export const title = 'Thread tree'

export const fresh: TreeView = { filter: 'conversation', query: '' }

export const nextFilter = (filter: Filter) => filters[(filters.indexOf(filter) + 1) % filters.length]!

const actions = (view: TreeView): PickAction[] => [
  { id: 'filter', label: `show: ${filterNames[view.filter]}` },
  { id: 'fork', label: 'Fork', row: true },
  { id: 'label', label: 'Label', row: true },
]

export const options = (view: TreeView, selected: number): PickOptions => ({
  status: 'Enter goes back to the selected point',
  actions: actions(view),
  hint: view.hint,
  query: view.query,
  selected,
  rank: false,
  empty: 'No entries match',
})
