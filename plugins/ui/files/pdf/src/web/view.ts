import type { OpenFile } from '@sand/file-viewer/contract'
import { ZoomControl, type Kit, type Point } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, intersectionObserver, resizeObserver, sig, span } from '@vaakx-dev/vrui'
import { type Opened, openPdf, openProblem } from './document'
import { type PageView, pageView } from './page'

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

const panner = (strip: HTMLElement) => {
  const scroller = scrollParent(strip)
  return ({ x, y }: Point) => {
    strip.scrollBy({ left: -x })
    scroller?.scrollBy({ top: -y })
  }
}

const reading = (kit: Kit, { document, shape }: Opened) => {
  const zoom = new ZoomControl()
  const room = sig(0)
  const width = derive(() => Math.max(1, Math.floor(room.get() * zoom.level.get())))
  const current = sig(1)
  const pages = Array.from({ length: document.numPages }, (_, index) => pageView({ kit, document, number: index + 1, width, shape }))
  const column = div({ class: 'flex w-fit min-w-full flex-col items-center gap-3' }, ...pages.map(page => page.node))
  const strip = div(
    {
      class: 'overflow-x-auto p-3',
      onMount: node => {
        resizeObserver(node, ([entry]) => room.set(entry?.contentRect.width ?? 0))
        follow(strip, pages, number => current.set(number))
        return zoom.show({ node, content: column, wheel: 'scrolls', moveBy: panner(node) })
      },
    },
    column,
  )
  const bar = div(
    { class: ['sticky bottom-3 mb-3 flex items-center gap-1 self-center rounded-lg bg-neutral-800 p-1 pl-3', kit.floatingEdge] },
    span({ class: 'text-sm tabular-nums text-neutral-400', 'aria-label': () => `Page ${current.get()} of ${document.numPages}` }, () => `${current.get()} / ${document.numPages}`),
    kit.zoomControls(zoom, { surface: 'raised' }),
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
