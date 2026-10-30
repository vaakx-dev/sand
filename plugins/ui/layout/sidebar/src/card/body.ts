import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ThreadItem } from '../items/item'
import { status } from './status'
import { actionStrip, type StripParts } from './strip'

export interface CardParts {
  kit: Kit
  item: Sig<ThreadItem>
  selected: Sig<boolean>
  minute: Sig<number>
  strip: StripParts
}

const onHover = 'group-hover:flex group-focus-visible-within:flex'

const onTouchCurrent = ({ selected }: CardParts) => (selected.get() ? 'touch:flex' : '')

const offTouchCurrent = ({ selected }: CardParts) => (selected.get() ? 'touch:hidden' : '')

const statusSlot = (parts: CardParts) =>
  span(
    {
      class: () =>
        parts.strip.choosing.get() ? 'hidden' : ['flex shrink-0 items-center text-xs group-hover:hidden group-focus-visible-within:hidden', offTouchCurrent(parts)],
    },
    status(parts.kit, parts.item, parts.minute),
  )

const actions = (parts: CardParts) => actionStrip(parts.kit, parts.strip, [onHover, () => onTouchCurrent(parts)])

const avatar = ({ kit, item }: CardParts) =>
  kit.projectAvatar(
    item.map(value => value.project),
    item.map(value => value.icon),
    14,
  )

const titleLook = ({ item, selected }: CardParts) => (selected.get() || item.get().unread ? 'font-medium text-neutral-100' : 'text-neutral-400')

const placeText = (value: ThreadItem) => [value.project, value.subtitle].filter(Boolean).join(' · ')

const pcMark = ({ item }: CardParts) =>
  show(
    () => Boolean(item.get().pcMark),
    () => item.get().pcMark?.(),
  )

const place = (parts: CardParts) =>
  div(
    { class: 'flex h-5 min-w-0 items-center gap-1.5', title: parts.item.map(value => tildeHome(value.path ?? '')) },
    avatar(parts),
    span({ class: 'flex min-w-0 flex-1 items-center gap-1.5' }, parts.kit.metaLine(parts.item.map(placeText)), pcMark(parts)),
    statusSlot(parts),
    actions(parts),
  )

const title = (parts: CardParts) =>
  div({ class: ['truncate text-sm', () => titleLook(parts)], title: parts.item.map(value => value.title) }, parts.item.map(value => value.title))

export const cardBody = (parts: CardParts) => div(place(parts), title(parts))
