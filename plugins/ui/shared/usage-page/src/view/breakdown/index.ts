import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, sig, type Sig } from '@vaakx-dev/vrui'
import type { Metric } from '../../format'
import { breakdownList } from './list'
import { breakdowns, rowsOf, type Breakdown, type Row, type RowSource } from './rows'

const SHORT_LIST = 5

const LABELS: Record<Breakdown, string> = {
  projects: 'Project',
  models: 'Model',
  accounts: 'Account',
  pcs: 'PC',
  periods: 'Day',
}

const UNITS: Record<Breakdown, string> = {
  projects: 'projects',
  models: 'models',
  accounts: 'accounts',
  pcs: 'PCs',
  periods: 'days',
}

const moreButton = ({ quietButton }: Kit, rows: Row[], all: Sig<boolean>, unit: string) =>
  rows.length > SHORT_LIST
    ? quietButton({ size: 'sm', class: 'self-start', onClick: () => all.set(!all.get()) }, () => (all.get() ? `Show top ${SHORT_LIST}` : `Show all ${rows.length} ${unit}`))
    : null

export const breakdownView = (source: RowSource, view: Sig<Breakdown>, metric: Metric) => {
  const { kit } = source
  const choices = breakdowns.map(value => ({ value, label: LABELS[value] }))
  const all = sig(false)
  const choose = (value: Breakdown) => {
    all.set(false)
    view.set(value)
  }
  const rows = derive(() => rowsOf(source, view.get(), metric))
  const shown = derive(() => ({ list: rows.get(), every: all.get(), chosen: view.get() }))
  return div(
    { class: 'flex flex-col gap-2' },
    kit.pageSection(
      { title: 'Breakdown', action: kit.segmented(choices, view, choose, { label: 'Breakdown' }) },
      dynamicChild(shown, ({ list, every, chosen }) => breakdownList(LABELS[chosen], every ? list : list.slice(0, SHORT_LIST), list, metric)),
    ),
    dynamicChild(rows, list => moreButton(kit, list, all, UNITS[view.get()])),
  )
}
