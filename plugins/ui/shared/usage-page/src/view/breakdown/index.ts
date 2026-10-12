import { dynamicChild, type Sig } from '@vaakx-dev/vrui'
import { breakdownList } from './list'
import { breakdowns, rowsOf, type Breakdown, type RowSource } from './rows'

const labels = (hourly: boolean): Record<Breakdown, string> => ({
  projects: 'Project',
  models: 'Model',
  threads: 'Thread',
  pcs: 'PC',
  periods: hourly ? 'Hour' : 'Day',
})

export const breakdownView = (source: RowSource, view: Sig<Breakdown>) => {
  const { segmented, settingsSection } = source.kit
  const names = labels(source.usage.bucket === 'hour')
  const choices = breakdowns.map(value => ({ value, label: names[value] }))
  return settingsSection(
    { title: 'Breakdown', action: segmented(choices, view, value => view.set(value), { label: 'Breakdown' }) },
    dynamicChild(view, current => breakdownList(source.kit, rowsOf(source, current), source.usage.accounts)),
  )
}
