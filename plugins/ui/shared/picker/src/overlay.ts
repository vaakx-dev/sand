import type { Shell } from '@sand/ui-shell/contract'
import type { Kit, SheetSize } from '@sand/ui-kit/contract'
import type { Child, EventHandler } from '@vaakx-dev/vrui'

export interface PickSheet {
  title: string
  size: SheetSize
  close: () => void
  keydown: EventHandler<KeyboardEvent>
}

export const openSheet = (frame: Shell, { sheetTitle }: Kit, { title, size, close, keydown }: PickSheet, ...children: Child[]) =>
  frame.sheet({ label: title, look: 'bare', size, head: () => sheetTitle(title), body: () => children, onKeyDown: keydown, onClose: close }).close
