import type { Diagnosis, RouteEntry, RouteKind } from '@sand/devices-contract'
import type { IconName } from '@sand/ui-kit/contract'
import { div, keys, show, span, type Sig } from '@vaakx-dev/vrui'
import { msWords, routeAddress, routeWords } from '../../status/words'
import type { Ui } from '../../ui'
import type { Dragging } from './drag'
import { rowMark } from './integrations/rows'

export const routeIcons: Record<RouteKind, IconName> = { local: 'laptop', lan: 'wifi', tailscale: 'globe', via: 'via' }

export interface RouteRowParts {
  ui: Ui
  diagnosis: () => Diagnosis | undefined
  dragging: Sig<Dragging | undefined>
  index: () => number
  press(event: PointerEvent): void
  shift(delta: number): void
  toggle(): void
}

const latencyOf = (diagnosis: Diagnosis | undefined, key: string) => {
  const status = diagnosis?.status
  if (status?.phase === 'connected' && status.route.key === key) return status.latency
  return diagnosis?.attempts.findLast(attempt => attempt.route.key === key && attempt.result === 'ok')?.ms
}

const detailOf = (entry: RouteEntry, diagnosis: Diagnosis | undefined) => {
  if (entry.blocked === 'disabled') return 'Off'
  if (entry.blocked === 'blocked-https') return 'Blocked on secure pages'
  return [routeAddress(entry.route), msWords(latencyOf(diagnosis, entry.route.key))].filter(Boolean).join(' · ') || ' '
}

const inUse = (entry: RouteEntry, diagnosis: Diagnosis | undefined) => {
  const status = diagnosis?.status
  return status?.phase === 'connected' && status.route.key === entry.route.key
}

const dropLine = () => div({ class: 'mx-3 h-1 rounded-full bg-accent-500' })

export const dropMarker = (dragging: Sig<Dragging | undefined>, at: () => number) =>
  show(() => {
    const state = dragging.get()
    return Boolean(state && state.drop === at() && state.drop !== state.from && state.drop !== state.from + 1)
  }, dropLine)

export const routeRow = (parts: RouteRowParts, entry: Sig<RouteEntry>) => {
  const { ui, diagnosis, dragging, index } = parts
  const { badge, icon, plainButton, settingsRow, toggleSwitch } = ui.kit
  const words = () => routeWords(entry.get().route, ui.data.nameOf)
  const off = () => entry.get().blocked === 'disabled'
  const lifted = () => dragging.get()?.from === index()
  const grip = plainButton(
    {
      class: '-ml-2 inline-flex cursor-grab touch-none rounded-md text-neutral-500 hover:text-neutral-100',
      title: 'Drag to change the order',
      'aria-label': () => `Move ${words()}. Use the arrow keys.`,
      onPointerDown: event => parts.press(event),
      onKeyDown: keys({ ArrowUp: () => parts.shift(-1), ArrowDown: () => parts.shift(1) }),
    },
    icon('grip', 'md'),
  )
  return div(
    { [rowMark]: '', class: ['flex flex-col', () => (lifted() ? 'opacity-50' : '')] },
    dropMarker(dragging, index),
    settingsRow(
      {
        lead: span({ class: 'flex items-center gap-3 text-neutral-400' }, grip, icon(routeIcons[entry.get().route.kind], 'md')),
        title: span(
          { class: ['flex min-w-0 items-center gap-2', () => (off() ? 'opacity-50' : '')] },
          span({ class: 'min-w-0 truncate' }, words),
          show(
            () => inUse(entry.get(), diagnosis()),
            () => badge('success', 'In use'),
          ),
        ),
        detail: () => detailOf(entry.get(), diagnosis()),
      },
      toggleSwitch({ on: () => !off(), 'aria-label': () => `Use ${words()}`, onClick: parts.toggle }),
    ),
  )
}
