import type { Wire } from '@sand/web-client/contract'
import type { HtmlRenderEntry } from '../contract'
import { div, effect, resource, show, sig } from '@sand/dom'
import { maxHeight, minHeight } from '../page/limits'
import { hostPath } from '../page/protocol'
import { listenToFrame, sandboxedFrame, showPageIn } from './integrations/frame'

const startHeight = 320

const lastHeights = new Map<string, number>()

const clamp = (height: number, cap: number) => Math.min(cap, maxHeight, Math.max(minHeight, Math.round(height)))

const openTab = (url: string) => void window.open(url, '_blank', 'noopener,noreferrer')

const failure = (title: string) => div({ class: 'flex h-full items-center justify-center text-xs text-neutral-500' }, `Couldn't load ${title}`)

export const htmlFrame = (wire: Wire, thread: string, data: HtmlRenderEntry) => {
  const cap = data.height ?? maxHeight
  const height = sig(clamp(data.height ?? lastHeights.get(data.id) ?? startHeight, cap))
  const resize = (next: number) => {
    const fitted = clamp(next, cap)
    lastHeights.set(data.id, fitted)
    height.set(fitted)
  }
  const loads = sig(0)
  const page = resource(() => wire.call<string>({ type: 'html.page', session: thread, render: data.id }), { lazy: true })
  const failed = page.error.map(Boolean)

  const frame = sandboxedFrame({
    title: data.title,
    src: hostPath,
    class: 'block h-full w-full border-0',
    onLoad: () => {
      if (page.data.get() === undefined && !page.loading.get()) page.refetch()
      loads.update(count => count + 1)
    },
  })

  effect(() => {
    const html = page.data.get()
    const load = loads.get()
    if (!load || html === undefined) return
    showPageIn(frame, html)
  })

  return div(
    {
      class: 'relative mb-4 w-full',
      style: { height: () => `${height.get()}px` },
      onMount: () => listenToFrame(frame, { resize, open: openTab }),
    },
    show(failed.map(failing => !failing), () => frame),
    show(failed.map(failing => !failing), () =>
      show(page.data.map(html => html === undefined), () => div({ class: 'pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-neutral-500' }, 'loading…')),
    ),
    show(failed, () => failure(data.title)),
  )
}
