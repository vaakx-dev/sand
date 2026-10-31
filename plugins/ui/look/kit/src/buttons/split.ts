import { read, show, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { spinner } from '../marks/marks'
import { dropdown, type Placement } from '../menus/dropdown'
import { primaryAction } from './button'

export interface SplitButtonProps {
  onClick(): void
  menu(close: () => void): Child[]
  disabled?: MaybeReactive<boolean>
  busy?: MaybeReactive<boolean>
  title?: MaybeReactive<string>
  menuDisabled?: MaybeReactive<boolean>
  menuTitle?: string
  placement?: Placement
  size?: 'sm' | 'md'
}

export const splitButton = (
  { onClick, menu, disabled = false, busy = false, title, menuDisabled = false, menuTitle = 'More actions', placement = 'below-right', size = 'md' }: SplitButtonProps,
  ...children: Child[]
) =>
  dropdown({
    placement,
    class: 'shrink-0',
    items: menu,
    trigger: press =>
      span(
        { class: 'flex items-center gap-px' },
        primaryAction(
          { size, title, disabled: () => read(disabled) || read(busy), 'aria-busy': () => String(read(busy)), onClick, class: 'rounded-r-none' },
          show(
            () => read(busy),
            () => spinner(size === 'sm' ? 12 : 14),
          ),
          ...children,
        ),
        primaryAction(
          { ...press, size, title: menuTitle, 'aria-label': menuTitle, disabled: menuDisabled, class: ['rounded-l-none', size === 'sm' ? 'px-1' : 'px-2'] },
          icon('down', size === 'sm' ? 12 : 14),
        ),
      ),
  })
