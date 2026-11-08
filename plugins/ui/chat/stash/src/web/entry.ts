import { div, portal, preventThen, show, sig, span } from '@vaakx-dev/vrui'
import { stashRows, type ListParts } from './list'

export const stashEntry = (parts: ListParts) => {
  const { kit, entries, phone } = parts
  const open = sig(false)
  const close = () => open.set(false)
  const rows = () => [kit.sectionHeading(span({ class: 'min-w-0 flex-1 truncate' }, 'Stash')), stashRows(parts, close)]
  const button = kit.plainButton(
    {
      title: 'Stash',
      'aria-label': 'Stash',
      class: 'relative inline-flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-100',
      ...kit.popupTrigger(open),
      onMouseDown: preventThen(),
      onClick: open.toggle(),
    },
    kit.icon('archive', 16),
    span({ class: 'absolute -top-1 -right-1 text-xs leading-none tabular-nums text-neutral-400' }, () => String(entries.get().length)),
  )
  return div(
    { class: 'relative ml-auto flex shrink-0', hidden: () => !entries.get().length },
    button,
    show(
      () => open.get() && entries.get().length > 0,
      () =>
        phone()
          ? portal(document.body, kit.bottomSheet({ close, from: button }, ...rows()))
          : kit.popover(close, { class: 'right-0 bottom-full mb-2 max-h-80 w-80 overflow-y-auto *:first:pt-1.5' }, ...rows()),
    ),
  )
}
