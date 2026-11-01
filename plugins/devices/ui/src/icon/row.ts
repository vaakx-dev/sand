import type { PcView } from '@sand/devices-contract'
import { type Child, div, dynamicChild, show, type Sig, sig } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import { iconKinds } from './kinds'
import { iconPicker } from './picker'

const tileLook =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-700 text-neutral-100 hover:bg-neutral-600 aria-expanded:ring-2 aria-expanded:ring-accent-500'

const iconTile = (ui: Ui, view: Sig<PcView>, picking: Sig<boolean>) =>
  ui.kit.plainButton(
    {
      class: tileLook,
      title: 'Change icon',
      'aria-label': () => `Change ${ui.data.nameOf(view.get().id)}’s icon`,
      'aria-expanded': () => String(picking.get()),
      onClick: () => picking.update(open => !open),
    },
    dynamicChild(
      () => view.get().icon,
      kind => ui.kit.icon(iconKinds[kind].glyph, 'md'),
    ),
  )

export const withIconPicker = (ui: Ui, view: Sig<PcView>, row: Child) => {
  const picking = sig(false)
  return div(
    { class: 'flex flex-col bg-neutral-800' },
    div({ class: 'flex min-w-0 items-center pl-4' }, iconTile(ui, view, picking), div({ class: 'min-w-0 flex-1' }, row)),
    show(picking, () => iconPicker(ui, view, () => picking.set(false))),
  )
}
