import type { LimitWindow } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { colorVar, div, sig, span } from '@vaakx-dev/vrui'
import type { Forecast } from '../../../data/forecast/project'
import { legendItem, legendRow } from '../../chart/legend'
import { forecastChart, readout } from './chart'
import { missingNote } from './note'

export type Forecasts = Map<string, Forecast | undefined>

export interface PanelProps {
  windows: LimitWindow[]
  forecasts: Forecasts
  chosen: string | undefined
  choose(window: string): void
  color: string
}

const legend = (color: string) =>
  legendRow(legendItem(color, false, 'Left'), legendItem(color, true, 'Forecast'), legendItem(colorVar('neutral', 500), true, 'Even pace'))

const outFirst = (forecasts: Forecasts) => (a: LimitWindow, b: LimitWindow) =>
  (forecasts.get(a.id)?.outAt ?? Infinity) - (forecasts.get(b.id)?.outAt ?? Infinity) || (b.duration ?? 0) - (a.duration ?? 0)

const urgentWindow = (windows: LimitWindow[], forecasts: Forecasts) => windows.toSorted(outFirst(forecasts))[0]

export const forecastPanel = (kit: Kit, { windows, forecasts, chosen, choose, color }: PanelProps) => {
  const { segmented } = kit
  const window = windows.find(found => found.id === chosen) ?? urgentWindow(windows, forecasts)
  if (!window) return null
  const forecast = forecasts.get(window.id)
  const hovered = sig<number | undefined>(undefined)
  return div(
    { class: 'flex flex-col gap-3 border-t border-neutral-700 pt-4' },
    div(
      { class: 'flex flex-wrap items-center gap-x-4 gap-y-2' },
      forecast ? readout(forecast, hovered) : span({ class: 'text-xs text-neutral-500' }, 'Forecast'),
      span({ class: 'flex-1' }),
      windows.length > 1
        ? segmented(
            windows.map(found => ({ value: found.id, label: found.label })),
            window.id,
            choose,
            { label: 'Limit', inset: true },
          )
        : null,
    ),
    forecast ? forecastChart(window, forecast, color, hovered) : missingNote(window),
    forecast ? legend(color) : null,
  )
}
