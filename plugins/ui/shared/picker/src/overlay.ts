import type { Kit, SheetSize } from '@sand/ui-kit/contract'
import { div, mount, type Child, type EventHandler } from '@vaakx-dev/vrui'

export interface SheetSpec {
  title: string
  size: SheetSize
  close: () => void
  keydown: EventHandler<KeyboardEvent>
}

export const openSheet = ({ overlay, sheet, sheetHead }: Kit, { title, size, close, keydown }: SheetSpec, ...children: Child[]) =>
  mount(document.body, div({ class: 'contents', onKeyDown: keydown }, overlay(close, sheet({ size, 'aria-label': title }, sheetHead({ title, close }), ...children))))
