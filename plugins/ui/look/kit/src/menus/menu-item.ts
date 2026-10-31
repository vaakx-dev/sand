import { media, read, show, span, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { rowButton } from '../buttons/button'
import { icon, type IconName } from '../icons/lucide'
import { surfaceFill } from '../surface'
import { hasReason } from './reason'

export type MenuSize = 'sm' | 'md'

export type MenuItemProps = Props<HTMLButtonElement> & {
  size?: MaybeReactive<MenuSize>
  tone?: 'danger'
  icon?: IconName
  active?: MaybeReactive<boolean>
}

export type ChoiceItemProps = Omit<MenuItemProps, 'tone' | 'active'> & { selected: MaybeReactive<boolean> }

export const menuSizes: Record<MenuSize, string> = { sm: 'min-h-8 px-2 text-sm', md: 'min-h-12 px-3 text-sm' }

const idleText = { normal: 'text-neutral-100', danger: 'text-danger-400' }

export const menuIcon = (name: IconName) => span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(name, 'md'))

export const choiceCheck = (on: MaybeReactive<boolean>) =>
  show(
    () => read(on),
    () => span({ class: 'inline-flex shrink-0 text-neutral-100' }, icon('check', 'md')),
  )

export const pointerSize = () => {
  const fine = media('(pointer: fine)')
  return (): MenuSize => (fine.get() ? 'sm' : 'md')
}

const menuFill = surfaceFill('raised')

const itemLabel = (children: Child[]) => (hasReason(children) ? [span({ class: 'flex min-w-0 flex-1 flex-col py-1' }, ...children)] : children)

const itemRow = ({ size = pointerSize(), tone, active = false, icon: glyph, class: extra, ...props }: MenuItemProps, children: Child[], trail: Child = null) => {
  const text = tone === 'danger' ? idleText.danger : idleText.normal
  return rowButton(
    {
      ...props,
      class: [
        'gap-3 rounded-md ring-inset transition-colors',
        () => menuSizes[read(size)],
        text,
        menuFill.hover,
        menuFill.marked,
        menuFill.opened,
        () => (read(active) ? menuFill.on : ''),
        extra,
      ],
    },
    glyph ? menuIcon(glyph) : null,
    ...itemLabel(children),
    trail,
  )
}

export const menuItem = (props: MenuItemProps, ...children: Child[]) => itemRow(props, children)

export const choiceItem = ({ selected, ...props }: ChoiceItemProps, ...children: Child[]) =>
  itemRow({ role: 'menuitemradio', 'aria-checked': () => String(read(selected)), ...props }, children, choiceCheck(selected))
