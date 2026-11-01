import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { derive, div, dynamicChild, show, span, type Child, type Sig } from '@vaakx-dev/vrui'
import type { RowDecor } from '../decorations/registry'
import type { ThreadItem } from '../items/item'
import { status } from './status'
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

const pcIcon = ({ item }: CardParts, here: () => boolean) =>
  show(
    () => here() && Boolean(item.get().pcIcon),
    () => item.get().pcIcon?.(),
  )

const smallLine = (title: Sig<string> | undefined, ...children: Child[]) =>
  div({ class: 'flex h-5 min-w-0 items-center gap-1.5 text-xs text-neutral-400', title }, ...children)

const projectLine = (parts: CardParts) =>
  smallLine(
    parts.item.map(value => tildeHome(value.path ?? '')),
    avatar(parts),
    span({ class: 'min-w-0 flex-1 truncate' }, parts.item.map(value => value.project)),
    statusSlot(parts),
    actions(parts),
  )

const titleLine = (parts: CardParts, detailed: Sig<boolean>) =>
  div(
    { class: 'flex min-w-0 items-center gap-1.5' },
    div({ class: ['min-w-0 flex-1 truncate text-sm', () => titleLook(parts)], title: parts.item.map(value => value.title) }, parts.item.map(value => value.title)),
    pcIcon(parts, () => !detailed.get()),
  )

const decorSlot = (found: Sig<Child[] | null>, look: string) => dynamicChild(found, children => (children ? span({ class: look }, children) : null))

const detailLine = (parts: CardParts, detailed: Sig<boolean>) =>
  show(detailed, () =>
    smallLine(
      undefined,
      decorSlot(parts.decor.meta, 'flex min-w-0 flex-1 items-center gap-1.5'),
      decorSlot(parts.decor.marks, 'ml-auto flex shrink-0 items-center gap-1.5 tabular-nums'),
      pcIcon(parts, () => true),
    ),
  )

export const cardBody = (parts: CardParts) => {
  const detailed = derive(() => parts.decor.meta.get() !== null || parts.decor.marks.get() !== null)
  return div(projectLine(parts), titleLine(parts, detailed), detailLine(parts, detailed))
}
