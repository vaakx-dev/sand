import type { RouteEntry } from '@sand/devices-contract'
import { derive, div, show } from '@vaakx-dev/vrui'
import type { Ui } from '../../ui'
import { moveIndex, routeDrag } from './drag'
import { dropMarker, routeRow } from './row'

const prefsOf = (entries: RouteEntry[]) => ({
  order: entries.map(entry => entry.route.key),
  disabled: entries.filter(entry => entry.blocked === 'disabled').map(entry => entry.route.key),
})

export const routesSection = (ui: Ui, pc: string) => {
  const { emptyState, icon, quietButton, rowList, settingsSection } = ui.kit
  const diagnosis = ui.data.changes.read(() => ui.ctx.pcs.diagnosis(pc))
  const entries = derive(() => [...(diagnosis.get()?.routes ?? [])].sort((a, b) => a.rank - b.rank))
  const save = (next: RouteEntry[]) => ui.ctx.pcs.setRoutePrefs(pc, prefsOf(next))
  const drag = routeDrag((from, drop) => save(moveIndex(entries.get(), from, drop)))
  const indexOf = (key: string) => entries.get().findIndex(entry => entry.route.key === key)

  const toggle = (key: string) => {
    const next = entries.get().map(entry => {
      if (entry.route.key !== key) return entry
      const off = entry.blocked === 'disabled'
      return { ...entry, blocked: off ? undefined : ('disabled' as const) }
    })
    save(next)
  }
  const shift = (key: string, delta: number) => {
    const from = indexOf(key)
    const to = from + delta
    if (from < 0 || to < 0 || to >= entries.get().length) return
    save(moveIndex(entries.get(), from, delta > 0 ? to + 1 : to))
  }

  return settingsSection(
    { title: 'Ways to connect', note: 'sand tries these from the top and uses the first that answers. Drag to change the order.', action: quietButton({ size: 'sm', surface: 'raised', onClick: () => ui.ctx.pcs.retry(pc) }, icon('reload', 'sm'), 'Test again') },
    div(
      { class: 'contents', onMount: drag.bind },
      rowList(
        entries,
        entry => entry.route.key,
        entry =>
          routeRow(
            {
              ui,
              diagnosis: () => diagnosis.get(),
              dragging: drag.dragging,
              index: () => indexOf(entry.get().route.key),
              press: event => drag.press(indexOf(entry.get().route.key), event),
              shift: delta => shift(entry.get().route.key, delta),
              toggle: () => toggle(entry.get().route.key),
            },
            entry,
          ),
      ),
    ),
    dropMarker(drag.dragging, () => entries.get().length),
    show(
      () => !entries.get().length,
      () => emptyState({ flush: true, text: 'sand doesn’t know any way to reach this PC yet.' }),
    ),
  )
}
