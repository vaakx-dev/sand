import { pcHello } from '@sand/devices-contract'
import { shell, type SheetHandle } from '@sand/ui-shell/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { htmlPage, type HtmlRenderEntry } from '../contract'
import { div, effect, resource, show, sig } from '@vaakx-dev/vrui'
import { hostPath } from '../page/protocol'
import type { FrameContext } from './context'
import { expandedPage } from './expand'
import { frameHeight, type FrameHeights } from './heights'
import { sandboxedFrame } from './integrations/frame'
import { onceNearView } from './near'
import { connectPage } from './page'

const loadingNote = ({ loadingState }: Kit) => div({ class: 'pointer-events-none absolute inset-0 flex items-center justify-center' }, loadingState())

const failure = ({ errorState }: Kit, title: string, retry: () => void) =>
  div({ class: 'absolute inset-0 flex items-center justify-center' }, errorState({ text: `Couldn't load ${title}`, retry }))

const expandButton = ({ floatButton, icon }: Kit, open: () => void) =>
  div(
    { class: 'absolute top-2 right-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 touch:opacity-100' },
    floatButton({ size: 'sm', title: 'Open full screen', 'aria-label': 'Open full screen', onClick: open }, icon('expand', 'sm')),
  )

const framedPage = (ctx: FrameContext, thread: string, data: HtmlRenderEntry, resize: (height: number) => void) => {
  const { kit, wire } = ctx
  const loads = sig(0)
  const page = resource(() => wire.call(htmlPage, { session: thread, render: data.id }), { lazy: true })
  const failed = page.error.map(Boolean)

  const frame = sandboxedFrame({
    'aria-label': data.title,
    src: hostPath,
    class: 'block h-full w-full border-0',
    style: { visibility: () => (failed.get() ? 'hidden' : '') },
    onLoad: () => {
      if (page.data.get() === undefined && !page.loading.get()) page.refetch()
      loads.update(count => count + 1)
    },
  })
  const connection = connectPage(ctx, frame, { resize, swipe: way => ctx.get(shell)?.swipe(way) })

  const retry = () => {
    if (!failed.get()) return
    frame.src = hostPath
    page.refetch()
  }

  effect(() => {
    const html = page.data.get()
    if (!loads.get() || html === undefined) return
    connection.show(html)
  })

  const box = div(
    { class: 'h-full w-full', onMount: () => joinDisposers(connection.listen(), ctx.on(pcHello, retry)) },
    frame,
    show(() => !failed.get() && page.data.get() === undefined, () => loadingNote(kit)),
    show(failed, () => failure(kit, data.title, retry)),
  )
  return { box, html: () => page.data.get() }
}

export const htmlFrame = (ctx: FrameContext, heights: FrameHeights, thread: string, data: HtmlRenderEntry) => {
  const measured = sig<number | undefined>(undefined)
  const near = sig(false)
  const height = () => frameHeight(data, measured.get(), heights.get(data.id))
  let expanded: SheetHandle | undefined

  const page = framedPage(ctx, thread, data, next => {
    measured.set(next)
    heights.set(data.id, height())
  })

  const close = () => {
    expanded?.close()
    expanded = undefined
  }

  const expand = () => {
    const html = page.html()
    if (html === undefined) return
    close()
    expanded = ctx.get(shell)?.sheet(expandedPage(ctx, data, html, height()))
  }

  return div(
    {
      class: 'group relative mb-3 w-full',
      style: { height: () => `${height()}px` },
      ref: box => {
        onceNearView(box, () => near.set(true))
        return close
      },
    },
    show(near, () => page.box),
    show(near, () => expandButton(ctx.kit, expand)),
  )
}
