import { div, dynamicChild, segmented, settingsSection, type Sig } from '@sand/dom'
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

export const chartView = (usage: Merged, metric: Sig<Metric>) =>
  settingsSection(
    { title: () => titleOf(usage, metric.get()), action: segmented(metrics, metric, value => metric.set(value), { label: 'Metric' }) },
    block(
      dynamicChild(metric, current => {
        const { keys, series } = seriesOf(usage, current)
        return div({ class: 'flex flex-col gap-3' }, plot(usage, keys, series, current), legend(series))
      }),
    ),
  )
