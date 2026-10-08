import { div, effect, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { read } from '../../reactive/read'
import type { Listbox } from './model'

const revealWhenSelected = (box: Listbox, index: MaybeReactive<number>) => (node: Node) =>
  effect(() => {
    if (box.isSelected(read(index)) && box.following()) (node as HTMLElement).scrollIntoView({ block: 'nearest' })
  })

export const optionProps = (box: Listbox, index: MaybeReactive<number>) => ({
  role: 'option',
  'aria-selected': () => box.isSelected(read(index)),
  onMouseMove: () => box.hover(read(index)),
  onClick: () => {
    box.pick(read(index))
  },
  onMount: revealWhenSelected(box, index),
})

export const listboxRow = (box: Listbox, index: MaybeReactive<number>, { class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div(
    {
      ...optionProps(box, index),
      ...props,
      class: [
        'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm cursor-pointer',
        () => (box.isSelected(read(index)) ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-300'),
        extra,
      ],
    },
    ...children,
  )
