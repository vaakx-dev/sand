import { media, read, show, span, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { rowButton } from '../buttons/button'
import { icon, type IconName } from '../icons/lucide'
import { surfaceFill } from '../surface'

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

export const menuItem = ({ size = pointerSize(), tone, active = false, icon: glyph, class: extra, ...props }: MenuItemProps, ...children: Child[]) => {
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
    ...children,
  )
}

export const choiceItem = ({ selected, ...props }: ChoiceItemProps, ...children: Child[]) =>
  menuItem({ role: 'menuitemradio', 'aria-checked': () => String(read(selected)), ...props }, ...children, choiceCheck(selected))
