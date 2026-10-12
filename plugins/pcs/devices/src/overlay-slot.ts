import { place } from '@sand/kit/web'
import type { Context, Dispose } from 'drydock'

export const overlaySlot = (ctx: Context, order = 100) => {
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const open = (view: () => HTMLElement) => {
    close()
    unplace = place(ctx, 'overlay', view, order)
  }
  return { open, close, isOpen: () => unplace !== undefined }
}
