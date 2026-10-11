import type { Cdp } from '../chrome'
import type { Viewport } from '../contract'

type Listener = (frame: Uint8Array) => void

const quality = 70

export const createScreencast = (cdp: Cdp, viewport: () => Viewport) => {
  const listeners = new Set<Listener>()
  let last: Uint8Array | undefined

  const publish = (data: string) => {
    last = Buffer.from(data, 'base64')
    for (const listener of listeners) listener(last)
  }

  const start = () => {
    const { width, height, scale } = viewport()
    return cdp.send('Page.startScreencast', { format: 'jpeg', quality, maxWidth: Math.round(width * scale), maxHeight: Math.round(height * scale) })
  }

  const still = async () => publish((await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'jpeg', quality })).data)

  cdp.on<{ data: string; sessionId: number }>('Page.screencastFrame', ({ data, sessionId }) => {
    cdp.fire('Page.screencastFrameAck', { sessionId })
    publish(data)
  })

  const subscribe = (listener: Listener) => {
    listeners.add(listener)
    if (listeners.size === 1) start().then(still).catch(() => undefined)
    else if (last) listener(last)
    return () => {
      listeners.delete(listener)
      if (!listeners.size) cdp.fire('Page.stopScreencast')
    }
  }

  const restart = async () => {
    if (!listeners.size) return
    await cdp.send('Page.stopScreencast')
    await start()
  }

  return { subscribe, restart }
}
