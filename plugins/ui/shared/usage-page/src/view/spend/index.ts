import { usageRanges } from '@sand/usage/records'
import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import type { Metric } from '../../format'
import type { UsageModel } from '../../model'
import { rangeLabel } from '../../range'
import { breakdownView } from '../breakdown'
import { chartView } from '../chart'
import { unpricedRow } from '../notices'
import { figures } from './figures'

const periodPicker = ({ segmented }: Kit, model: UsageModel) =>
  segmented(
    usageRanges.map(value => ({ value, label: rangeLabel(value) })),
    model.range,
    value => model.range.set(value),
    { label: 'Period' },
  )

const overview = (kit: Kit, usage: Merged, metric: Metric) =>
  kit.sectionRow({}, div({ class: 'flex min-w-0 flex-1 flex-col gap-4 py-2' }, figures(kit, usage, metric), chartView(kit, usage, metric)))

export const spendView = (kit: Kit, usage: Merged, model: UsageModel, metric: Metric) => {
  const { emptyState, settingsSection } = kit
  const head = { title: `${usage.bucket === 'hour' ? 'Hourly' : 'Daily'} ${metric}`, action: periodPicker(kit, model) }
  if (!usage.total.turns) return settingsSection(head, emptyState({ surface: 'group', text: 'No usage in this range' }))
  return div(
    { class: 'flex flex-col gap-6' },
    settingsSection(head, overview(kit, usage, metric), metric === 'cost' ? usage.unpriced.map(item => unpricedRow(kit, item)) : null),
    breakdownView({ kit, usage }, model.breakdown, metric),
  )
}
