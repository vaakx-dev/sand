import { usageRanges } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import type { Metric } from '../../format'
import type { UsageModel } from '../../model'
import { rangeLabel } from '../../range'
import { breakdownView } from '../breakdown'
import { chartView } from '../chart'
import { unpricedNotes } from '../notices'
import { block } from '../parts'
import { figures } from './figures'

const periodPicker = ({ segmented }: Kit, model: UsageModel) =>
  segmented(
    usageRanges.map(value => ({ value, label: rangeLabel(value) })),
    model.range,
    value => model.range.set(value),
    { label: 'Period' },
  )

export const spendView = (kit: Kit, usage: Merged, model: UsageModel, metric: Metric) => {
  const { hintRow, settingsSection } = kit
  const head = { title: `${usage.bucket === 'hour' ? 'Hourly' : 'Daily'} ${metric}`, action: periodPicker(kit, model) }
  if (!usage.total.turns) return settingsSection(head, hintRow('No usage in this range'))
  const source = { kit, usage, nameOf: model.nameOf, openThread: model.openThread, copy: model.copy, showOnly: model.showOnly }
  return div(
    { class: 'flex flex-col gap-6' },
    settingsSection(head, block(kit, figures(usage, metric), chartView(kit, usage, metric))),
    div({ class: 'flex flex-col gap-2' }, breakdownView(source, model.breakdown, metric), metric === 'cost' ? unpricedNotes(kit, usage.unpriced) : null),
  )
}
