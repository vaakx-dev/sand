import { hasOpenLayer, listen, type Swipe } from '@sand/dom'
import { swipeMessage } from '@sand/dom/swipe-relay'
import { follow, type Drag } from '../follow'

interface Relayed {
  method?: unknown
  params?: { phase?: unknown; x?: unknown; time?: unknown }
}

const fromFrame = (source: MessageEventSource | null) => [...document.getElementsByTagName('iframe')].some(frame => frame.contentWindow === source)

export const frameSwipes = (begin: () => Swipe | undefined) => {
  let drag: Drag | undefined

  const start = (x: number, time: number) => {
    drag?.end(time)
    const swipe = hasOpenLayer(true) ? undefined : begin()
    drag = swipe && follow(swipe, x, time)
  }

  const end = (time: number) => {
    drag?.end(time)
    drag = undefined
  }

  listen(window, 'message', ({ source, data }: MessageEvent) => {
    const { method, params } = (data ?? {}) as Relayed
    if (method !== swipeMessage || !fromFrame(source) || typeof params?.time !== 'number') return
    const { phase, x, time } = params
    if (phase === 'end') return end(time)
    if (typeof x !== 'number') return
    if (phase === 'start') start(x, time)
    if (phase === 'move') drag?.move(x, time)
  })
}
