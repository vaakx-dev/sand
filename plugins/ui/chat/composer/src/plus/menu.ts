import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { show } from '@vaakx-dev/vrui'
import type { PlusEntry } from '../contract'
import type { Plus } from './entries'

export const plusMenu = (kit: Kit, { entries }: Plus, choose: () => void, attachable: () => boolean) => {
  const { contextMenu, icon, iconButton } = kit
  const menu = contextMenu()
  const title = () => (entries.get().length ? 'Add' : 'Attach files')

  const attach: MenuAction = { id: 'attach', label: 'Attach files', icon: 'paperclip', group: 'attach', run: choose }

  const entryAction = (entry: PlusEntry, index: number): MenuAction => ({
    id: `entry-${index}`,
    label: entry.label(),
    icon: entry.icon(),
    group: 'entries',
    run: () => entry.open.set(true),
  })

  const spec = (): MenuSpec => ({ title: 'Add', actions: [...(attachable() ? [attach] : []), ...entries.get().map(entryAction)] })

  const press = (event: MouseEvent) => (entries.get().length ? menu.openBelow(event, spec) : choose())

  return [
    show(
      () => attachable() || entries.get().length > 0,
      () =>
        iconButton(
          {
            surface: 'raised',
            class: 'text-neutral-500',
            title,
            'aria-label': title,
            'aria-haspopup': () => (entries.get().length ? 'menu' : 'false'),
            onClick: press,
          },
          icon('plus', 'sm'),
        ),
    ),
    menu.view(),
  ]
}
