import { onPressOutside } from '../layers/outside'
import { dismissible } from '../layers/stack'
import { disposeAll, div, type Child, type Props } from '@vaakx-dev/vrui'
import { layer } from '../layer'
import { floatingEdge } from '../surface'

export const menuSeparator = () => div({ role: 'separator', class: 'h-2' })

export const popover = (close: () => void, { class: extra, onMount: mounted, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div(
    {
      role: 'menu',
      ...props,
      class: [layer.menu, 'absolute flex min-w-48 flex-col rounded-lg bg-neutral-800 p-1 animate-fade', floatingEdge, extra],
      onMount: node => {
        const stops = [dismissible(node, close), onPressOutside(node, close)]
        const unmount = mounted?.(node)
        return () => {
          disposeAll(stops)
          if (typeof unmount === 'function') unmount()
        }
      },
    },
    ...children,
  )
