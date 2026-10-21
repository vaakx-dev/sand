import { sig } from '@vaakx-dev/vrui'

interface DragSlot {
  id: string
  group: string
  movable: boolean
}

type Side = 'before' | 'after'

export interface ReorderOptions {
  siblings(group: string): string[]
  move(id: string, above: string | undefined, below: string | undefined): void
}

const edge = { before: 'top', after: 'bottom' }

export const reorder = (options: ReorderOptions) => {
  const dragged = sig<DragSlot | undefined>(undefined)
  const over = sig<{ id: string; side: Side } | undefined>(undefined)

  const clear = () => {
    dragged.set(undefined)
    over.set(undefined)
  }

  const sideOf = (event: DragEvent): Side => {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    return event.clientY < box.top + box.height / 2 ? 'before' : 'after'
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
    options.move(moving.id, order[index - 1], order[index])
  }

  return (slot: () => DragSlot) => ({
    draggable: slot().movable,
    'data-drop': () => {
      const target = over.get()
      return target?.id === slot().id ? edge[target.side] : undefined
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
      const { currentTarget, relatedTarget } = event
      const inside = currentTarget instanceof Node && relatedTarget instanceof Node && currentTarget.contains(relatedTarget)
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

export type Reorder = ReturnType<typeof reorder>
