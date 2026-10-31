import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { derive, div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { RowDecor } from '../decorations/registry'
import type { ThreadItem } from '../items/item'
import { badgeShown, badgeSlot, status } from './status'
import { actionStrip, type StripParts } from './strip'

export interface CardParts {
  kit: Kit
  item: Sig<ThreadItem>
  selected: Sig<boolean>
  minute: Sig<number>
  strip: StripParts
  decor: RowDecor
}

const onHover = 'group-hover:flex group-focus-visible-within:flex'

const onTouchCurrent = ({ selected }: CardParts) => (selected.get() ? 'touch:flex' : '')

const offTouchCurrent = ({ selected }: CardParts) => (selected.get() ? 'touch:hidden' : '')

const statusSlots = (parts: CardParts) => {
  const badged = badgeShown(parts.item, parts.decor.badge)
  return [
    badgeSlot(
      parts.decor.badge,
      derive(() => badged.get() && !parts.strip.choosing.get()),
    ),
    span(
      {
        class: () =>
          parts.strip.choosing.get() || badged.get() ? 'hidden' : ['flex shrink-0 items-center text-xs group-hover:hidden group-focus-visible-within:hidden', offTouchCurrent(parts)],
      },
      status(parts.kit, parts.item, parts.minute, badged),
    ),
  ]
}

const actions = (parts: CardParts) => actionStrip(parts.kit, parts.strip, [onHover, () => onTouchCurrent(parts)])

const avatar = ({ kit, item }: CardParts) =>
  kit.projectAvatar(
    item.map(value => value.project),
    item.map(value => value.icon),
    14,
  )

const titleLook = ({ item, selected }: CardParts) => (selected.get() || item.get().unread ? 'font-medium text-neutral-100' : 'text-neutral-400')

const placeText = ({ item, decor }: CardParts) =>
  derive(() => {
    const value = item.get()
    return [value.project, value.pc, decor.place.get() || value.folder, decor.subtitle.get()].filter(Boolean).join(' · ')
  })

const pcMark = ({ item }: CardParts) =>
  show(
    () => Boolean(item.get().pcMark),
    () => item.get().pcMark?.(),
  )

const place = (parts: CardParts) =>
  div(
    { class: 'flex h-5 min-w-0 items-center gap-1.5', title: parts.item.map(value => tildeHome(value.path ?? '')) },
    avatar(parts),
    span({ class: 'flex min-w-0 flex-1 items-center gap-1.5' }, parts.kit.metaLine(placeText(parts)), pcMark(parts)),
    ...statusSlots(parts),
    actions(parts),
  )

const title = (parts: CardParts) =>
  div({ class: ['truncate text-sm', () => titleLook(parts)], title: parts.item.map(value => value.title) }, parts.item.map(value => value.title))

export const cardBody = (parts: CardParts) => div(place(parts), title(parts))
