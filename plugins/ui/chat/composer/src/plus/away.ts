import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, span } from '@vaakx-dev/vrui'
import type { PlusEntry } from '../contract'
import type { Plus } from './entries'

const resetTitle = 'Back to the usual place'

export const awayChip = (kit: Kit, { entries }: Plus) => {
  const { icon, metaLine, plainButton, pressOpens } = kit
  const away = derive(() => entries.get().filter(entry => entry.unusual()))

  const part = (entry: PlusEntry, index: number) => [
    index ? metaLine('·') : null,
    plainButton(
      { ...pressOpens(entry.open, entry.open.toggle()), title: entry.label, class: 'flex min-w-0 items-center gap-1 rounded-sm hover:text-neutral-100' },
      icon(entry.icon(), 'xs'),
      metaLine(() => entry.unusual() ?? ''),
    ),
  ]

  const reset = () => away.get().forEach(entry => entry.reset())

  const chip = (list: PlusEntry[]) =>
    span(
      { class: 'flex h-6 min-w-0 items-center gap-1 text-neutral-500' },
      ...list.flatMap(part),
      plainButton(
        { title: resetTitle, 'aria-label': resetTitle, class: 'inline-flex shrink-0 rounded-sm p-px hover:text-neutral-100', onClick: reset },
        icon('x', 'xs'),
      ),
    )

  return dynamicChild(away, list => (list.length ? chip(list) : null))
}
