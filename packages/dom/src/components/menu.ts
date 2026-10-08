import { div, onDocument, type Child, type Props } from '@vaakx-dev/vrui'
import { read } from '../reactive/read'
import { dismissible, layer } from '../shell/layers'
import { rowButton, type ToggleProps } from './button'

export const menuItem = ({ size = 'md', active = false, class: extra, ...props }: ToggleProps, ...children: Child[]) =>
  rowButton(
    {
      ...props,
      class: [
        'gap-3 rounded-lg',
        size === 'sm' ? 'min-h-8 px-2 text-xs' : 'min-h-10 px-3 text-sm',
        () => (read(active) ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-300'),
        extra,
      ],
    },
    ...children,
  )

export const groupLabel = (...children: Child[]) => div({ class: 'px-3 pt-3 pb-1 text-xs font-medium text-neutral-500' }, ...children)

const closeOnOutsidePress = (node: HTMLElement, close: () => void) =>
  onDocument(node, 'mousedown', event => {
    const anchor = node.offsetParent ?? node
    if (!anchor.contains(event.target as Node)) close()
  })

export const popover = (close: () => void, { class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div(
    {
      role: 'menu',
      ...props,
      class: [layer.menu, 'absolute flex min-w-48 flex-col rounded-xl bg-neutral-800 p-1 shadow-xl ring-1 ring-neutral-700 animate-pop', extra],
      onMount: node => {
        const stopEscape = dismissible(node, close)
        const stopOutside = closeOnOutsidePress(node as HTMLElement, close)
        return () => {
          stopEscape()
          stopOutside()
        }
      },
    },
    ...children,
  )

export const popoverItem = (props: ToggleProps, ...children: Child[]) =>
  menuItem({ size: 'sm', ...props, class: ['hover:bg-neutral-700 hover:text-neutral-100', props.class] }, ...children)
