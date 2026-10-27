import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import type { Metric } from '../../format'
import { legend } from './legend'
import { plot } from './plot'
import { seriesOf } from './series'

export const chartView = (kit: Kit, usage: Merged, metric: Metric) => {
  const { keys, series } = seriesOf(kit, usage, metric)
  if (series.every(line => !line.total)) return null
  return div({ class: 'flex flex-col gap-3' }, plot(kit, usage, keys, series, metric), legend(kit, series))
}
