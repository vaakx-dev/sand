import { dynamicChild, read, show, span, type Child, type ClassValue, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { icon, type IconName } from '../icons/lucide'
import { finePointer } from '../reactive/pointer'
import { rowButton } from './button'

export type MenuSize = 'sm' | 'md'

export type MenuItemProps = Props<HTMLButtonElement> & {
  size?: MaybeReactive<MenuSize>
  tone?: 'danger'
  icon?: IconName
  active?: MaybeReactive<boolean>
}

export type ChoiceItemProps = Omit<MenuItemProps, 'tone' | 'active'> & { selected: MaybeReactive<boolean> }

export const menuSizes: Record<MenuSize, string> = { sm: 'min-h-8 px-2 text-xs', md: 'min-h-12 px-3 text-sm' }

const iconSizes: Record<MenuSize, number> = { sm: 14, md: 16 }

const normal = 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 focus-visible:bg-neutral-700'
const danger = 'text-danger-400 hover:bg-danger-950 hover:text-danger-300 focus-visible:bg-danger-950'
const highlighted = { normal: 'bg-neutral-700 text-neutral-100', danger: 'bg-danger-950 text-danger-300' }
const picked = 'text-neutral-100 hover:bg-neutral-700 focus-visible:bg-neutral-700'

export const menuIcon = (name: IconName, size: MaybeReactive<MenuSize>, muted = true) =>
  dynamicChild(
    () => iconSizes[read(size)],
    px => icon(name, px),
    span({ class: ['inline-flex shrink-0', muted && 'text-neutral-500'] }),
  )

const menuRow = ({ size = 'md', icon: glyph, class: extra, ...props }: Omit<MenuItemProps, 'tone' | 'active'>, look: ClassValue, muted: boolean, ...children: Child[]) =>
  rowButton(
    {
      ...props,
      class: ['gap-3 rounded-lg', () => menuSizes[read(size)], look, extra],
    },
    glyph ? menuIcon(glyph, size, muted) : null,
    ...children,
  )

export const menuItem = ({ tone, active = false, ...props }: MenuItemProps, ...children: Child[]) =>
  menuRow(props, () => (tone === 'danger' ? (read(active) ? highlighted.danger : danger) : read(active) ? highlighted.normal : normal), tone !== 'danger', ...children)

export const pointerSize = () => {
  const fine = finePointer()
  return (): MenuSize => (fine.get() ? 'sm' : 'md')
}

export const choiceItem = ({ selected, size = pointerSize(), ...props }: ChoiceItemProps, ...children: Child[]) =>
  menuRow(
    { role: 'menuitemradio', 'aria-checked': () => String(read(selected)), size, ...props },
    () => (read(selected) ? picked : normal),
    true,
    ...children,
    show(
      () => read(selected),
      () => span({ class: 'inline-flex shrink-0 text-accent-400' }, icon('check', 14)),
    ),
  )

export const popoverItem = ({ size = pointerSize(), ...props }: MenuItemProps, ...children: Child[]) => menuItem({ size, ...props }, ...children)
