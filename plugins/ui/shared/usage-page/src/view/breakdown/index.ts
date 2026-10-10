import { dynamicChild, segmented, type Sig } from '@sand/dom'
import { block, heading, spacer } from '../parts'
import { rowsOf, type Breakdown, type RowSource } from './rows'
import { breakdownList } from './list'

const labels = (hourly: boolean): Record<Breakdown, string> => ({
  projects: 'Project',
  models: 'Model',
  threads: 'Thread',
  pcs: 'PC',
  periods: hourly ? 'Hour' : 'Day',
})

export const breakdownView = (source: RowSource, view: Sig<Breakdown>) => {
  const names = labels(source.usage.bucket === 'hour')
  const choices = (Object.keys(names) as Breakdown[]).map(value => ({ value, label: names[value] }))
  return block(
    [heading('Breakdown'), spacer(), segmented(choices, view, value => view.set(value), { label: 'Breakdown' })],
    dynamicChild(view, current => breakdownList(rowsOf(source, current), source.usage.accounts)),
  )
}
