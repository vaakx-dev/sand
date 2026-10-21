import { onPressOutside } from '../layers/outside'
import { dismissible } from '../layers/stack'
import { disposeAll, div, type Child, type Props } from '@vaakx-dev/vrui'
import { layer } from '../layer'

export const menuSeparator = () => div({ role: 'separator', class: 'mx-2 my-1 h-px bg-neutral-700' })

export const groupLabel = (...children: Child[]) => div({ class: 'px-3 pt-3 pb-1 text-xs font-medium text-neutral-500' }, ...children)

export const popover = (close: () => void, { class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div(
    {
      role: 'menu',
      ...props,
      class: [layer.menu, 'absolute flex min-w-48 flex-col rounded-xl bg-neutral-800 p-1 shadow-xl ring-1 ring-neutral-700 animate-pop', extra],
      onMount: node => {
        const stops = [dismissible(node, close), onPressOutside(node, close)]
        return () => disposeAll(stops)
      },
    },
    ...children,
  )
