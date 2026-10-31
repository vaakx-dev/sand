import { onDocument } from '@vaakx-dev/vrui'
import type { DiffLine } from '../contract'
import type { LinePicker } from './picker'

const rowIndex = (target: EventTarget | null, onNumber: boolean) => {
  if (!(target instanceof Element)) return undefined
  if (onNumber && !target.closest('[data-side]')) return undefined
  const value = target.closest<HTMLElement>('[data-row]')?.dataset.row
  return value === undefined ? undefined : Number(value)
}

export const pickHandlers = (picker: LinePicker, path: string, lines: DiffLine[]) => {
  let dragging = false
  return {
    onPointerDown: (event: PointerEvent) => {
      const index = event.button === 0 ? rowIndex(event.target, true) : undefined
      if (index === undefined) return
      event.preventDefault()
      dragging = event.pointerType === 'mouse'
      picker.pick(path, lines, index, event.shiftKey, dragging)
    },
    onPointerOver: (event: PointerEvent) => {
      const index = dragging ? rowIndex(event.target, false) : undefined
      if (index !== undefined) picker.drag(path, index)
    },
    onMount: (owner: HTMLElement) =>
      onDocument(owner, 'pointerup', () => {
        if (!dragging) return
        dragging = false
        picker.release()
      }),
  }
}
