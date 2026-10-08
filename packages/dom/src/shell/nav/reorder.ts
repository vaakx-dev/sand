import { sig } from '@vaakx-dev/vrui'
import { color } from '../../theme/tokens'

export interface DragSlot {
  id: string
  group: string
  movable: boolean
}

type Side = 'before' | 'after'

export interface ReorderOptions {
  axis: 'x' | 'y'
  siblings(group: string): string[]
  move(group: string, id: string, above: string | undefined, below: string | undefined): void
}

const edge = { x: { before: 'inset 2px 0 0', after: 'inset -2px 0 0' }, y: { before: 'inset 0 2px 0', after: 'inset 0 -2px 0' } }

export type Reorder = ReturnType<typeof reorder>

export const reorder = (options: ReorderOptions) => {
  const dragged = sig<DragSlot | undefined>(undefined)
  const over = sig<{ id: string; side: Side } | undefined>(undefined)

  const clear = () => {
    dragged.set(undefined)
    over.set(undefined)
  }

  const sideOf = (event: DragEvent): Side => {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const early = options.axis === 'x' ? event.clientX < box.left + box.width / 2 : event.clientY < box.top + box.height / 2
    return early ? 'before' : 'after'
  }

  const accepts = (target: DragSlot) => {
    const moving = dragged.get()
    return moving && moving.group === target.group ? moving : undefined
  }

  const drop = (target: DragSlot, side: Side) => {
    const moving = accepts(target)
    clear()
    if (!moving || moving.id === target.id) return
    const order = options.siblings(target.group).filter(id => id !== moving.id)
    const index = order.indexOf(target.id) + (side === 'after' ? 1 : 0)
    if (index < 0) return
    options.move(target.group, moving.id, order[index - 1], order[index])
  }

  return (slot: () => DragSlot) => ({
    draggable: slot().movable,
    style: {
      boxShadow: () => {
        const target = over.get()
        return target?.id === slot().id ? `${edge[options.axis][target.side]} ${color('accent', 400)}` : ''
      },
    },
    onDragStart(event: DragEvent) {
      if (!slot().movable) return
      dragged.set(slot())
      event.dataTransfer?.setData('text/plain', slot().id)
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    },
    onDragOver(event: DragEvent) {
      if (!accepts(slot())) return
      event.preventDefault()
      const side = sideOf(event)
      const current = over.get()
      if (current?.id !== slot().id || current.side !== side) over.set({ id: slot().id, side })
    },
    onDragLeave(event: DragEvent) {
      const inside = (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)
      if (!inside && over.get()?.id === slot().id) over.set(undefined)
    },
    onDrop(event: DragEvent) {
      if (!accepts(slot())) return
      event.preventDefault()
      drop(slot(), sideOf(event))
    },
    onDragEnd: clear,
  })
}
