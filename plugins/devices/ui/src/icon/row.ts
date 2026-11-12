import type { PcView } from '@sand/devices-contract'
import { div, dynamicChild, show, type Sig, sig } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import { iconKinds } from './kinds'
import { iconPicker } from './picker'

const iconTile = (ui: Ui, view: Sig<PcView>, picking: Sig<boolean>) =>
  ui.kit.iconButton(
    {
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

export const withIconPicker = (ui: Ui, view: Sig<PcView>, row: (lead: HTMLElement) => HTMLElement) => {
  const picking = sig(false)
  return div({ class: 'flex flex-col' }, row(iconTile(ui, view, picking)), show(picking, () => iconPicker(ui, view, () => picking.set(false))))
}
