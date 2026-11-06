import { computers } from '@sand/computers/contract'
import { definePlugin } from 'drydock'
import { windowsDesktop } from './windows/desktop'

const desktops: Partial<Record<NodeJS.Platform, typeof windowsDesktop>> = { win32: windowsDesktop }

export default definePlugin({
  name: 'computer-desktop',
  description: "This PC's own desktop as a computer: screenshots, the mouse and keyboard, and UI elements",
  inject: { computers },
  apply(ctx) {
    const desktop = desktops[process.platform]?.()
    if (!desktop) return
    ctx.effect(() => ctx.computers.register(desktop))
    ctx.effect(() => desktop.close)
  },
})
