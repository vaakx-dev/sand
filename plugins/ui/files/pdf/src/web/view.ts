import type { OpenFile } from '@sand/file-viewer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, intersectionObserver, resizeObserver, sig, span } from '@vaakx-dev/vrui'
import { type Opened, openPdf, openProblem } from './document'
import { type PageView, pageView } from './page'
import { zoomLevels } from './zoom'

type Opening = { kind: 'opening' } | ({ kind: 'ready' } & Opened) | { kind: 'failed'; error: string }

const NEAR_MARGIN = '100% 0px'

const VISIBLE_STEPS = Array.from({ length: 11 }, (_, index) => index / 10)

const SCROLLING = /auto|scroll/

const scrollParent = (node: Element): Element | null => {
  const parent = node.parentElement
  if (!parent) return null
  return SCROLLING.test(getComputedStyle(parent).overflowY) ? parent : scrollParent(parent)
}

const mostVisible = (heights: Map<number, number>) =>
  [...heights].reduce((best, next) => (next[1] > best[1] || (next[1] === best[1] && next[0] < best[0]) ? next : best), [1, 0])[0]

const keepPlace = (strip: HTMLElement, page: Element, change: () => void) => {
  const scroller = scrollParent(strip)
  if (!scroller) return change()
  const view = scroller.getBoundingClientRect()
  const before = page.getBoundingClientRect()
  const down = (view.top - before.top) / before.height
  const across = (strip.scrollLeft + strip.clientWidth / 2) / strip.scrollWidth
  change()
  const after = page.getBoundingClientRect()
  scroller.scrollTop += after.top + down * after.height - view.top
  strip.scrollLeft = across * strip.scrollWidth - strip.clientWidth / 2
}

const follow = (strip: HTMLElement, pages: PageView[], current: (number: number) => void) => {
  const root = scrollParent(strip)
  const byNode = new Map<Element, PageView>(pages.map(page => [page.node, page]))
  const heights = new Map<number, number>()
  const near = intersectionObserver(strip, entries => entries.forEach(entry => byNode.get(entry.target)?.near.set(entry.isIntersecting)), { root, rootMargin: NEAR_MARGIN })
  const seen = (entry: IntersectionObserverEntry) => {
    const page = byNode.get(entry.target)
    if (page) heights.set(page.number, entry.intersectionRect.height)
  }
  const visible = intersectionObserver(
    strip,
    entries => {
      entries.forEach(seen)
      current(mostVisible(heights))
    },
    { root, threshold: VISIBLE_STEPS },
  )
  pages.forEach(({ node }) => [near, visible].forEach(observer => observer.observe(node)))
}

const reading = (kit: Kit, { document, shape }: Opened) => {
  const zoom = zoomLevels()
  const current = sig(1)
  const pages = Array.from({ length: document.numPages }, (_, index) => pageView({ kit, document, number: index + 1, width: zoom.width, shape }))
  const strip = div(
    {
      class: 'overflow-x-auto p-3',
      onMount: node => {
        resizeObserver(node, ([entry]) => zoom.room.set(entry?.contentRect.width ?? 0))
        follow(strip, pages, number => current.set(number))
      },
    },
    div({ class: 'flex w-fit min-w-full flex-col items-center gap-3' }, ...pages.map(page => page.node)),
  )
  const keeping = (change: () => void) => () => keepPlace(strip, pages[current.get() - 1]!.node, change)
  const bar = div(
    { class: ['sticky bottom-3 mb-3 flex items-center gap-1 self-center rounded-lg bg-neutral-800 p-1 pl-3', kit.floatingEdge] },
    span({ class: 'text-sm tabular-nums text-neutral-400', 'aria-label': () => `Page ${current.get()} of ${document.numPages}` }, () => `${current.get()} / ${document.numPages}`),
    kit.zoomControls({ label: zoom.label, canZoomOut: zoom.canZoomOut, zoomIn: keeping(zoom.zoomIn), zoomOut: keeping(zoom.zoomOut), fit: keeping(zoom.fit), surface: 'raised' }),
  )
  return div({ class: 'flex flex-col' }, strip, bar)
}

const pdfView = (kit: Kit, file: OpenFile) => {
  const state = sig<Opening>({ kind: 'opening' })
  const open = () => {
    state.set({ kind: 'opening' })
    const opening = openPdf(file)
    opening.opened.then(
      opened => state.set({ kind: 'ready', ...opened }),
      (error: unknown) => state.set({ kind: 'failed', error: openProblem(error) }),
    )
    return opening.close
  }
  return div(
    { class: 'flex flex-col', onMount: open },
    dynamicChild(state, shown => {
      if (shown.kind === 'ready') return reading(kit, shown)
      if (shown.kind === 'failed') return kit.errorState({ text: shown.error })
      return kit.loadingState({})
    }),
  )
}

export { pdfView }
