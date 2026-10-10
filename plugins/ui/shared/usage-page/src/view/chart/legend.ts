import { div, line, providerIcon, span, svg } from '@sand/dom'
import type { Series } from './series'

export const dash = '5 4'

const swatch = (series: Series) =>
  svg(
    { viewBox: '0 0 18 6', width: 18, height: 6, class: 'shrink-0', 'aria-hidden': 'true' },
    line({ x1: 0, x2: 18, y1: 3, y2: 3, stroke: series.color, strokeWidth: 2, ...(series.dashed && { strokeDasharray: dash }) }),
  )

export const seriesName = (series: Series) =>
  span({ class: 'inline-flex min-w-0 items-center gap-2' }, providerIcon(series.account.provider, 12), span({ class: 'truncate' }, series.label))

export const legend = (series: Series[]) =>
  div(
    { class: 'flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500' },
    series.map(item => span({ class: 'inline-flex items-center gap-2' }, swatch(item), seriesName(item))),
  )
