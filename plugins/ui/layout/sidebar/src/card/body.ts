import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { derive, div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ThreadItem } from '../items/item'
import { status } from './status'
import { actionStrip, type StripParts } from './strip'

export interface CardParts {
  kit: Kit
  item: Sig<ThreadItem>
  selected: Sig<boolean>
  mixed: Sig<boolean>
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

const avatar = ({ kit, item, mixed }: CardParts, size: 14 | 16) =>
  show(mixed, () =>
    kit.projectAvatar(
      item.map(value => value.project),
      item.map(value => value.icon),
      size,
    ),
  )

const titleLook = ({ item, selected }: CardParts, quiet: boolean) => {
  const value = item.get()
  if (selected.get() || value.unread) return 'font-medium text-neutral-100'
  return quiet ? 'text-neutral-400' : 'text-neutral-100'
}

const title = (parts: CardParts, quiet: boolean) =>
  span({ class: ['min-w-0 flex-1 truncate text-sm', () => titleLook(parts, quiet)] }, parts.item.map(value => value.title))

const metaText = (value: ThreadItem, mixed: boolean) => [mixed && value.project, value.subtitle].filter(Boolean).join(' · ')

const fullBody = (parts: CardParts) => {
  const meta = derive(() => metaText(parts.item.get(), parts.mixed.get()))
  return div(
    div({ class: 'flex h-5 items-center gap-2', title: parts.item.map(value => value.title) }, title(parts, false), statusSlot(parts), actions(parts)),
    show(meta.map(Boolean), () =>
      div(
        { class: 'flex h-5 min-w-0 items-center gap-1.5', title: parts.item.map(value => tildeHome(value.path ?? '')) },
        avatar(parts, 14),
        parts.kit.metaLine(meta),
      ),
    ),
  )
}

const compactTitle = (value: ThreadItem) => [value.title, value.project, tildeHome(value.path ?? '')].filter(Boolean).join('\n')

const compactBody = (parts: CardParts) =>
  div({ class: 'flex h-5 items-center gap-2', title: parts.item.map(compactTitle) }, avatar(parts, 16), title(parts, true), statusSlot(parts), actions(parts))

export const cardBody = (parts: CardParts, compact: boolean) => (compact ? compactBody(parts) : fullBody(parts))
