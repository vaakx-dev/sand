import { div, mount, overlay, sheet, sheetHead, type Child, type EventHandler, type SheetSize } from '@sand/dom'

export interface SheetSpec {
  title: string
  size: SheetSize
  close: () => void
  keydown: EventHandler<KeyboardEvent>
}

export const openSheet = ({ title, size, close, keydown }: SheetSpec, ...children: Child[]) =>
  mount(document.body, div({ class: 'contents', onKeyDown: keydown }, overlay(close, sheet({ size, 'aria-label': title }, sheetHead({ title, close }), ...children))))
