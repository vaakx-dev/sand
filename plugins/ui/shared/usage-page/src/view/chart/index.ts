import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import type { Metric } from '../../format'
import { block } from '../parts'
import { legend } from './legend'
import { plot } from './plot'
import { seriesOf } from './series'

const metrics: { value: Metric; label: string }[] = [
  { value: 'cost', label: 'Cost' },
  { value: 'tokens', label: 'Tokens' },
]

const titleOf = (usage: Merged, metric: Metric) => `${usage.bucket === 'hour' ? 'Hourly' : 'Daily'} ${metric}`

export const chartView = (kit: Kit, usage: Merged, metric: Sig<Metric>) => {
  const { segmented, settingsSection } = kit
  return settingsSection(
    { title: () => titleOf(usage, metric.get()), action: segmented(metrics, metric, value => metric.set(value), { label: 'Metric' }) },
    block(
      kit,
      dynamicChild(metric, current => {
        const { keys, series } = seriesOf(kit, usage, current)
        return div({ class: 'flex flex-col gap-3' }, plot(kit, usage, keys, series, current), legend(kit, series))
      }),
    ),
  )
}
