import { el, listen, type Props } from '@sand/dom'
import { openLink, showPage, sizeChanged } from '../../page/protocol'

interface Message {
  jsonrpc?: unknown
  id?: unknown
  method?: unknown
  params?: { height?: unknown; url?: unknown }
}

export interface FrameEvents {
  resize(height: number): void
  open(url: string): void
}

const isWebUrl = (url: unknown): url is string => typeof url === 'string' && /^https?:\/\//i.test(url)

const clickedIn = (frame: HTMLIFrameElement) => document.activeElement === frame && navigator.userActivation?.isActive !== false

const post = (frame: HTMLIFrameElement, message: object) => frame.contentWindow?.postMessage({ jsonrpc: '2.0', ...message }, '*')

export const sandboxedFrame = (props: Props<HTMLIFrameElement>) =>
  el('iframe', { ref: frame => frame.setAttribute('sandbox', 'allow-scripts'), ...props })

export const showPageIn = (frame: HTMLIFrameElement, html: string) => post(frame, { method: showPage, params: { html } })

export const listenToFrame = (frame: HTMLIFrameElement, events: FrameEvents) =>
  listen(window, 'message', event => {
    const { source, data } = event as MessageEvent
    const message = data as Message | null
    if (source !== frame.contentWindow || message?.jsonrpc !== '2.0') return
    if (message.method === sizeChanged && typeof message.params?.height === 'number') events.resize(message.params.height)
    if (message.method === openLink && isWebUrl(message.params?.url) && clickedIn(frame)) {
      events.open(message.params.url)
      post(frame, { id: message.id, result: {} })
    }
  })
