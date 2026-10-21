import { derive, div, dynamicChild, sig, type Sig } from '@vaakx-dev/vrui'
import type { Metric } from '../../format'
import { breakdownList } from './list'
import { breakdowns, rowsOf, type Breakdown, type Row, type RowSource } from './rows'

const shortList = 5

const labels = (hourly: boolean): Record<Breakdown, string> => ({
  projects: 'Project',
  models: 'Model',
  accounts: 'Account',
  pcs: 'PC',
  periods: hourly ? 'Hour' : 'Day',
})

const units: Record<Breakdown, string> = {
  projects: 'projects',
  models: 'models',
  accounts: 'accounts',
  pcs: 'PCs',
  periods: 'rows',
}

export const breakdownView = (source: RowSource, view: Sig<Breakdown>, metric: Metric) => {
  const { quietButton, segmented, settingsSection } = source.kit
  const names = labels(source.usage.bucket === 'hour')
  const choices = breakdowns.map(value => ({ value, label: names[value] }))
  const all = sig(false)
  const choose = (value: Breakdown) => {
    all.set(false)
    view.set(value)
  }
  const rows = derive(() => rowsOf(source, view.get(), metric))
  const shown = derive(() => (all.get() ? rows.get() : rows.get().slice(0, shortList)))
  const moreButton = (list: Row[]) =>
    list.length > shortList
      ? quietButton({ size: 'sm', class: 'self-start', onClick: () => all.set(!all.get()) }, () =>
          all.get() ? `Show top ${shortList}` : `Show all ${list.length} ${units[view.get()]}`,
        )
      : null
  return div(
    { class: 'flex flex-col gap-2' },
    settingsSection(
      { title: 'Breakdown', action: segmented(choices, view, choose, { label: 'Breakdown' }) },
      dynamicChild(shown, list => breakdownList(source.kit, list, source.usage.accounts, metric)),
    ),
    dynamicChild(rows, moreButton),
  )
}
