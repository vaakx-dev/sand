import type { Swipe } from '@sand/layout/contract'
import { el, listen, type Props } from '@vaakx-dev/vrui'
import { openLink, showPage, sizeChanged, swipeEnd, swipeMove, swipeStart } from '../../page/protocol'

interface Message {
  jsonrpc?: unknown
  id?: unknown
  method?: unknown
  params?: { height?: unknown; url?: unknown; dx?: unknown; velocity?: unknown }
}

export interface FrameEvents {
  resize(height: number): void
  open(url: string): void
  swipe(): Swipe | undefined
}

const isWebUrl = (url: unknown): url is string => typeof url === 'string' && /^https?:\/\//i.test(url)

const clickedIn = (frame: HTMLIFrameElement) => document.activeElement === frame && navigator.userActivation?.isActive !== false

const post = (frame: HTMLIFrameElement, message: object) => frame.contentWindow?.postMessage({ jsonrpc: '2.0', ...message }, '*')

export const sandboxedFrame = (props: Props<HTMLIFrameElement>) =>
  el('iframe', { ref: frame => frame.setAttribute('sandbox', 'allow-scripts'), ...props })

export const showPageIn = (frame: HTMLIFrameElement, html: string) => post(frame, { method: showPage, params: { html } })

const swipeRelay = (begin: () => Swipe | undefined) => {
  let swipe: Swipe | undefined
  return ({ method, params }: Message) => {
    if (method === swipeStart) swipe = begin()
    if (method === swipeMove && typeof params?.dx === 'number') swipe?.move(params.dx)
    if (method === swipeEnd && typeof params?.velocity === 'number') {
      swipe?.end(params.velocity)
      swipe = undefined
    }
  }
}

export const listenToFrame = (frame: HTMLIFrameElement, events: FrameEvents) => {
  const relaySwipe = swipeRelay(events.swipe)
  return listen(window, 'message', ({ source, data }: MessageEvent) => {
    const message = data as Message | null
    if (source !== frame.contentWindow || message?.jsonrpc !== '2.0') return
    if (message.method === sizeChanged && typeof message.params?.height === 'number') events.resize(message.params.height)
    if (message.method === openLink && isWebUrl(message.params?.url) && clickedIn(frame)) {
      events.open(message.params.url)
      post(frame, { id: message.id, result: {} })
    }
    relaySwipe(message)
  })
}
