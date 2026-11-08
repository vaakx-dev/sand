import { type PcIcon, pcIconSchema, type PcView } from '@sand/devices-contract'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import { iconKinds } from './kinds'

const optionLook = 'flex min-w-0 flex-col items-center gap-1.5 rounded-lg px-1 py-2 hover:bg-neutral-800 aria-pressed:bg-accent-500/15'

const option = (ui: Ui, view: Sig<PcView>, kind: PcIcon, choose: (kind: PcIcon) => void) => {
  const { icon, metaLine, plainButton } = ui.kit
  return plainButton(
    { 'aria-pressed': () => String(view.get().icon === kind), class: optionLook, onClick: () => choose(kind) },
    span({ class: 'text-neutral-100' }, icon(iconKinds[kind].glyph, 'md')),
    metaLine(iconKinds[kind].label),
    show(
      () => view.get().detectedIcon === kind,
      () => metaLine('detected'),
    ),
  )
}

export const iconPicker = (ui: Ui, view: Sig<PcView>, close: () => void) => {
  const choose = (kind: PcIcon) => {
    close()
    const { id, name } = view.get()
    if (kind !== view.get().icon) void ui.toasts.attempt(`Couldn’t change ${name}’s icon`, ui.data.devices.setIcon(id, kind))
  }
  return div(
    { class: 'pb-3 pl-11' },
    div(
      { class: 'grid max-w-80 grid-cols-4 gap-1.5', role: 'group', 'aria-label': 'Icon' },
      ...pcIconSchema.options.map(kind => option(ui, view, kind, choose)),
    ),
  )
}
