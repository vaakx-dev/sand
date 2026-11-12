import { div, preventThen, show, sig, span } from '@vaakx-dev/vrui'
import { stashRows, type ListParts } from './list'

export const stashEntry = (parts: ListParts) => {
  const { kit, entries, phone, frame } = parts
  const open = sig(false)
  const close = () => open.set(false)
  const heading = () => kit.sectionHeading(span({ class: 'min-w-0 flex-1 truncate' }, 'Stash'))
  const rows = () => [heading(), stashRows(parts, close)]
  const sheet = () =>
    span({
      hidden: true,
      onMount: () =>
        frame()?.sheet({ label: 'Stash', look: 'list', head: heading, body: () => div({ class: 'min-h-0 overflow-y-auto px-2 pb-2' }, stashRows(parts, close)), onClose: close }).close,
    })
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
          ? sheet()
          : kit.popover(close, { class: 'right-0 bottom-full mb-2 max-h-80 w-80 overflow-y-auto *:first:pt-1.5' }, ...rows()),
    ),
  )
}
