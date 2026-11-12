import type { Swipe, Way } from '@sand/ui-shell/contract'
import { el, listen, type Props } from '@vaakx-dev/vrui'
import { hostContext, openImage, openLink, pressKey, shortcutKeys, showPage, sizeChanged, swipeEnd, swipeMove, swipeStart } from '../../page/protocol'

interface Message {
  jsonrpc?: unknown
  id?: unknown
  method?: unknown
  params?: { height?: unknown; url?: unknown; delta?: unknown; way?: unknown; velocity?: unknown; src?: unknown; name?: unknown; key?: unknown }
}

export interface FrameEvents {
  resize?(height: number): void
  open(url: string): void
  image(src: string, name: string): void
  key(key: string): void
  swipe?(way: Way): Swipe | undefined
}

const isWebUrl = (url: unknown): url is string => typeof url === 'string' && /^https?:\/\//i.test(url)

const clickedIn = (frame: HTMLIFrameElement) => document.activeElement === frame && navigator.userActivation?.isActive !== false

const post = (frame: HTMLIFrameElement, message: object) => frame.contentWindow?.postMessage({ jsonrpc: '2.0', ...message }, '*')

export const sandboxedFrame = (props: Props<HTMLIFrameElement>) =>
  el('iframe', { ref: frame => frame.setAttribute('sandbox', 'allow-scripts'), ...props })

export const showPageIn = (frame: HTMLIFrameElement, html: string) => post(frame, { method: showPage, params: { html } })

export const sendTheme = (frame: HTMLIFrameElement, css: string) => post(frame, { method: hostContext, params: { css } })

export const sendKeys = (frame: HTMLIFrameElement, keys: string[]) => post(frame, { method: shortcutKeys, params: { keys } })

const WAYS: readonly unknown[] = ['left', 'right', 'up', 'down'] satisfies Way[]

const isWay = (value: unknown): value is Way => WAYS.includes(value)

const swipeRelay = (begin: (way: Way) => Swipe | undefined) => {
  let swipe: Swipe | undefined
  return ({ method, params }: Message) => {
    if (method === swipeStart) swipe = isWay(params?.way) ? begin(params.way) : undefined
    if (method === swipeMove && typeof params?.delta === 'number') swipe?.move(params.delta)
    if (method === swipeEnd && typeof params?.velocity === 'number') {
      swipe?.end(params.velocity)
      swipe = undefined
    }
  }
}

export const listenToFrame = (frame: HTMLIFrameElement, events: FrameEvents) => {
  const relaySwipe = swipeRelay(way => events.swipe?.(way))
  return listen<MessageEvent>(window, 'message', ({ source, data }) => {
    const message = data as Message | null
    if (source !== frame.contentWindow || message?.jsonrpc !== '2.0') return
    const params = message.params ?? {}
    if (message.method === sizeChanged && typeof params.height === 'number') {
      events.resize?.(params.height)
      return
    }
    if (message.method === pressKey && typeof params.key === 'string') {
      events.key(params.key)
      return
    }
    if (!clickedIn(frame)) return
    if (message.method === openLink && isWebUrl(params.url)) {
      events.open(params.url)
      post(frame, { id: message.id, result: {} })
      return
    }
    if (message.method === openImage && typeof params.src === 'string') {
      events.image(params.src, typeof params.name === 'string' ? params.name : '')
      return
    }
    relaySwipe(message)
  })
}
