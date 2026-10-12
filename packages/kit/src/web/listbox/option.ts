import { effect, read, type MaybeReactive } from '@vaakx-dev/vrui'
import type { Listbox } from './model'

const revealWhenSelected = (box: Listbox, index: MaybeReactive<number>) => (node: Element) =>
  effect(() => {
    if (box.isSelected(read(index)) && box.following()) node.scrollIntoView({ block: 'nearest' })
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
