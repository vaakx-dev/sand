import type { LimitWindow } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { Forecast } from '../../../data/forecast/project'
import { legendItem, legendRow } from '../../chart/legend'
import { forecastChart } from './chart'
import { forecastNote } from './note'

export type Forecasts = Map<string, Forecast | undefined>

export interface PanelProps {
  windows: LimitWindow[]
  forecasts: Forecasts
  chosen: string | undefined
  choose(window: string): void
  color: string
}

const legend = (color: string) => legendRow(legendItem(color, false, 'Left'), legendItem(color, true, 'Forecast from your recent weeks'))

const outFirst = (forecasts: Forecasts) => (a: LimitWindow, b: LimitWindow) =>
  (forecasts.get(a.id)?.outAt ?? Infinity) - (forecasts.get(b.id)?.outAt ?? Infinity) || (b.duration ?? 0) - (a.duration ?? 0)

export const urgentWindow = (windows: LimitWindow[], forecasts: Forecasts) => windows.toSorted(outFirst(forecasts))[0]

export const forecastSummary = (windows: LimitWindow[], forecasts: Forecasts) => {
  const window = urgentWindow(windows, forecasts)
  return window ? forecastNote(window, forecasts.get(window.id)) : null
}

export const forecastPanel = (kit: Kit, { windows, forecasts, chosen, choose, color }: PanelProps) => {
  const { segmented } = kit
  const window = windows.find(found => found.id === chosen) ?? urgentWindow(windows, forecasts)
  if (!window) return null
  const forecast = forecasts.get(window.id)
  return div(
    { class: 'flex flex-col gap-3' },
    forecastNote(window, forecast),
    forecast ? forecastChart(kit, window, forecast, color) : null,
    div(
      { class: 'flex flex-wrap items-center gap-x-4 gap-y-2' },
      forecast ? legend(color) : null,
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
  )
}
