import { div, float, overlay, sheet, sheetHead, type Child, type EventHandler } from '@sand/dom'

export const openSheet = (title: string, close: () => void, keydown: EventHandler<KeyboardEvent>, ...children: Child[]) =>
  float(div({ class: 'contents', onKeyDown: keydown }, overlay(close, sheet({ 'aria-label': title }, sheetHead(title, close), ...children))))
