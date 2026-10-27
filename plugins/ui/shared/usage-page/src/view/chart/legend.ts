import type { Kit } from '@sand/ui-kit/contract'
import { div, line, span, svg, type Child } from '@vaakx-dev/vrui'
import type { Series } from './series'

export const dash = '5 4'

const swatch = (color: string, dashed: boolean) =>
  svg(
    { viewBox: '0 0 18 6', width: 18, height: 6, class: 'shrink-0', 'aria-hidden': 'true' },
    line({ x1: 0, x2: 18, y1: 3, y2: 3, stroke: color, strokeWidth: 2, ...(dashed && { strokeDasharray: dash }) }),
  )

export const legendItem = (color: string, dashed: boolean, ...label: Child[]) => span({ class: 'inline-flex items-center gap-2' }, swatch(color, dashed), ...label)

export const legendRow = (...items: Child[]) => div({ class: 'flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500' }, ...items)

export const seriesName = ({ providerIcon }: Kit, series: Series) =>
  span({ class: 'inline-flex min-w-0 items-center gap-2' }, providerIcon(series.account.provider, 14), span({ class: 'truncate' }, series.label))

export const legend = (kit: Kit, series: Series[]) => legendRow(series.map(item => legendItem(item.color, item.dashed, seriesName(kit, item))))
