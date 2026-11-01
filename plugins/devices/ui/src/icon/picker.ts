import { type PcIcon, pcIconSchema, type PcView } from '@sand/devices-contract'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import { iconKinds } from './kinds'

const optionLook =
  'flex flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-xs text-neutral-400 hover:bg-neutral-700 aria-pressed:bg-accent-500/15 aria-pressed:text-neutral-100 aria-pressed:ring-1 aria-pressed:ring-accent-500/50'

const option = (ui: Ui, view: Sig<PcView>, kind: PcIcon, choose: (kind: PcIcon) => void) =>
  ui.kit.plainButton(
    { 'aria-pressed': () => String(view.get().icon === kind), class: optionLook, onClick: () => choose(kind) },
    span({ class: 'text-neutral-100' }, ui.kit.icon(iconKinds[kind].glyph, 'md')),
    iconKinds[kind].label,
    show(
      () => view.get().detectedIcon === kind,
      () => span({ class: 'text-neutral-500' }, 'detected'),
    ),
  )

export const iconPicker = (ui: Ui, view: Sig<PcView>, close: () => void) => {
  const choose = (kind: PcIcon) => {
    close()
    const { id, name } = view.get()
    if (kind !== view.get().icon) void ui.toasts.attempt(`Couldn’t change ${name}’s icon`, ui.data.devices.setIcon(id, kind))
  }
  return div(
    { class: 'pr-4 pb-3 pl-16' },
    div(
      { class: 'grid max-w-80 grid-cols-4 gap-1.5', role: 'group', 'aria-label': 'Icon' },
      ...pcIconSchema.options.map(kind => option(ui, view, kind, choose)),
    ),
  )
}
