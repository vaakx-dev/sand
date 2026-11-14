import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { show } from '@vaakx-dev/vrui'
import type { PickSource } from '@sand/attachments/web/contract'
import type { PlusEntry } from '../contract'
import type { Plus } from './entries'

export interface Picking {
  choose(source?: PickSource): void
  attachable(): boolean
  touch(): boolean
}

export const plusMenu = (kit: Kit, { entries }: Plus, { choose, attachable, touch }: Picking) => {
  const { contextMenu, icon, iconButton } = kit
  const menu = contextMenu()
  const opens = () => entries.get().length > 0 || (attachable() && touch())
  const title = () => (opens() ? 'Add' : 'Attach files')

  const camera: MenuAction = { id: 'camera', label: 'Take a photo', icon: 'camera', group: 'attach', run: () => choose('camera') }
  const library: MenuAction = { id: 'library', label: 'Photos and videos', icon: 'images', group: 'attach', run: () => choose('library') }
  const attach: MenuAction = { id: 'attach', label: 'Attach files', icon: 'paperclip', group: 'attach', run: () => choose('files') }
  const attachments = () => (touch() ? [camera, library, attach] : [attach])

  const entryAction = (entry: PlusEntry, index: number): MenuAction => ({
    id: `entry-${index}`,
    label: entry.label(),
    icon: entry.icon(),
    group: 'entries',
    run: () => entry.open.set(true),
  })

  const spec = (): MenuSpec => ({ title: 'Add', actions: [...(attachable() ? attachments() : []), ...entries.get().map(entryAction)] })

  const press = (event: MouseEvent) => (opens() ? menu.openBelow(event, spec) : choose('files'))

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
            'aria-haspopup': () => (opens() ? 'menu' : 'false'),
            onClick: press,
          },
          icon('plus', 'sm'),
        ),
    ),
    menu.view(),
  ]
}
