import { onDocument } from '@vaakx-dev/vrui'

const rowIndex = (target: EventTarget | null, onNumber: boolean) => {
  if (!(target instanceof Element)) return undefined
  if (onNumber && !target.closest('[data-side]')) return undefined
  const value = target.closest<HTMLElement>('[data-row]')?.dataset.row
  return value === undefined ? undefined : Number(value)
}

export interface PickActions {
  pick(index: number, extend: boolean): void
  drag(index: number): void
}

export const pickHandlers = ({ pick, drag }: PickActions) => {
  let dragging = false
  return {
    onPointerDown: (event: PointerEvent) => {
      const index = event.button === 0 ? rowIndex(event.target, true) : undefined
      if (index === undefined) return
      event.preventDefault()
      dragging = event.pointerType === 'mouse'
      pick(index, event.shiftKey)
    },
    onPointerOver: (event: PointerEvent) => {
      const index = dragging ? rowIndex(event.target, false) : undefined
      if (index !== undefined) drag(index)
    },
    onMount: (owner: HTMLElement) =>
      onDocument(owner, 'pointerup', () => {
        dragging = false
      }),
  }
}
