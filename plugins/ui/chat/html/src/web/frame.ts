import { layout } from '@sand/layout/contract'
import { theme } from '@sand/ui-theme/contract'
import type { kit as kitService, Kit } from '@sand/ui-kit/contract'
import type { wire as wireService } from '@sand/web-client/contract'
import { htmlPage, type HtmlRenderEntry } from '../contract'
import { div, effect, resource, show, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { maxHeight, minHeight } from '../page/limits'
import { hostPath } from '../page/protocol'
import { listenToFrame, sandboxedFrame, showPageIn } from './integrations/frame'
import { themed } from './theme'

const startHeight = 320

const lastHeights = new Map<string, number>()

const clamp = (height: number, cap: number) => Math.min(cap, maxHeight, Math.max(minHeight, Math.round(height)))

const loadingNote = ({ hint }: Kit) => div({ class: 'pointer-events-none absolute inset-0 flex items-center justify-center' }, hint('Loading…'))

const failure = ({ errorText }: Kit, title: string) => div({ class: 'flex h-full items-center justify-center' }, errorText(`Couldn't load ${title}`))

export const htmlFrame = (ctx: Context<{ kit: typeof kitService; wire: typeof wireService }>, thread: string, data: HtmlRenderEntry) => {
  const { kit, wire } = ctx
  const cap = data.height ?? maxHeight
  const height = sig(clamp(data.height ?? lastHeights.get(data.id) ?? startHeight, cap))
  const resize = (next: number) => {
    const fitted = clamp(next, cap)
    lastHeights.set(data.id, fitted)
    height.set(fitted)
  }
  const loads = sig(0)
  const page = resource(() => wire.call(htmlPage, { session: thread, render: data.id }), { lazy: true })
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
    showPageIn(frame, themed(html, ctx.get(theme)))
  })

  return div(
    {
      class: 'relative mb-4 w-full',
      style: { height: () => `${height.get()}px` },
      onMount: () => listenToFrame(frame, { resize, open: kit.openTab, swipe: () => ctx.get(layout)?.swipe() }),
    },
    show(() => !failed.get(), () => frame),
    show(() => !failed.get() && page.data.get() === undefined, () => loadingNote(kit)),
    show(failed, () => failure(kit, data.title)),
  )
}
