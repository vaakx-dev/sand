import type { Kit } from '@sand/ui-kit/contract'
import { show, sig, span } from '@vaakx-dev/vrui'
import type { PlusEntry } from '../contract'
import type { Plus } from './entries'

export const plusMenu = (kit: Kit, { entries }: Plus, choose: () => void) => {
  const { icon, iconButton, menuItem, menuSeparator, popover, pressOpens } = kit
  const open = sig(false)
  const close = () => open.set(false)
  const toggle = () => (entries.get().length ? open.update(value => !value) : choose())
  const title = () => (entries.get().length ? 'Add' : 'Attach files')

  const attach = () => {
    close()
    choose()
  }

  const enter = (entry: PlusEntry) => {
    close()
    entry.open.set(true)
  }

  const row = (entry: PlusEntry) =>
    menuItem(
      { icon: entry.icon(), onClick: () => enter(entry) },
      span({ class: 'min-w-0 flex-1 truncate' }, entry.label),
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('right', 'sm')),
    )

  const menu = () =>
    popover(
      close,
      { class: 'bottom-full left-0 mb-2 w-max max-w-80' },
      menuItem({ icon: 'paperclip', onClick: attach }, span({ class: 'min-w-0 flex-1 truncate' }, 'Attach files')),
      menuSeparator(),
      ...entries.get().map(row),
    )

  return [
    iconButton(
      {
        surface: 'raised',
        title,
        'aria-label': title,
        class: '-ml-2',
        ...pressOpens(open, toggle),
        'aria-haspopup': () => (entries.get().length ? 'menu' : 'false'),
      },
      icon('plus', 'md'),
    ),
    show(open, menu),
  ]
}
