import type { Browser } from '../contract'

export const framesPath = '/browser/frames'

const keepAliveMs = 4000
const maxQueued = 2

const framed = (frame: Uint8Array) => {
  const out = new Uint8Array(4 + frame.length)
  new DataView(out.buffer).setUint32(0, frame.length)
  out.set(frame, 4)
  return out
}

export const framesRoute = (browser: Browser) => (request: Request) => {
  const thread = new URL(request.url).searchParams.get('thread') ?? ''
  const tab = browser.find(thread)
  if (!tab) return new Response('No browser tab is open for this thread', { status: 404 })
  let streaming = true
  let stop = () => {}
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (frame: Uint8Array) => {
        if (streaming && (controller.desiredSize ?? 0) > -maxQueued) controller.enqueue(frame)
      }
      const unsubscribe = tab.frames(frame => push(framed(frame)))
      const keepAlive = setInterval(() => push(new Uint8Array(4)), keepAliveMs)
      stop = () => {
        if (!streaming) return
        streaming = false
        clearInterval(keepAlive)
        unsubscribe()
      }
      void tab.closed.then(() => {
        if (!streaming) return
        stop()
        controller.close()
      })
      request.signal.addEventListener('abort', stop, { once: true })
    },
    cancel: () => stop(),
  })
  return new Response(body, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } })
}
