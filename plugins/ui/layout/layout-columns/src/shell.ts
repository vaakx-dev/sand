import type { Region } from '@sand/protocol'
import { div, layer, type Sig, type Store } from '@sand/dom'
import { backdropOpacity, slideAside, slideSide, type Shift } from './slide'

export const regions: Region[] = ['top', 'side', 'main', 'aside', 'bottom', 'overlay']

export type Open = Record<'side' | 'aside', boolean>

export type Coverable = 'side' | 'main'

export interface ShellState {
  narrow: Sig<boolean>
  open: Store<Open>
  filled: Sig<Record<Region, boolean>>
  covered: Sig<Record<Coverable, boolean>>
  shift: Sig<Shift | undefined>
  swiped: Sig<boolean>
}

const safeArea = 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
const drawer = { top: '0', bottom: '0', left: '0', maxWidth: '85vw', paddingTop: 'env(safe-area-inset-top)' }
const sheet = { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }

export const buildShell = ({ narrow, open, filled, covered, shift, swiped }: ShellState, closeSide: () => void) => {
  const strip = (region: Region) => div({ class: () => (filled.get()[region] ? 'flex shrink-0 flex-col' : 'hidden') })
  const showSide = () => open.side.get() || (!narrow.get() && covered.get().side)
  const dragging = () => narrow.get() && shift.get() !== undefined

  const sideBody = div({ class: () => (covered.get().side ? 'hidden' : 'contents') })
  const sideCover = div({ class: () => (covered.get().side ? 'contents' : 'hidden') })
  const side = div(
    {
      class: () => {
        if (!filled.get().side || !(showSide() || dragging())) return 'hidden'
        return narrow.get()
          ? [layer.drawer, 'fixed flex w-80 flex-col bg-neutral-950 shadow-xl', swiped.get() ? null : 'animate-drawer']
          : 'flex min-h-0 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950'
      },
      style: () => (narrow.get() ? { ...drawer, ...slideSide(shift.get()) } : null),
    },
    sideBody,
    sideCover,
  )

  const mainBody = div({ class: 'contents' })
  const mainCover = div({ class: () => (covered.get().main ? [layer.drawer, 'absolute inset-0 flex flex-col bg-neutral-900'] : 'hidden') })
  const main = div({ class: 'relative flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-900', style: { isolation: 'isolate' } }, mainBody, mainCover)

  const aside = div({
    class: () => {
      if (!filled.get().aside || !(open.aside.get() || dragging()) || covered.get().main) return 'hidden'
      return narrow.get()
        ? [layer.drawer, 'fixed inset-0 flex flex-col bg-neutral-950']
        : 'flex min-h-0 min-w-0 w-80 shrink-0 flex-col border-l border-neutral-800 bg-neutral-950 lg:w-96 xl:w-full xl:max-w-lg'
    },
    style: () => (narrow.get() ? { ...sheet, ...slideAside(shift.get()) } : null),
  })

  const areas: Record<Region, HTMLElement> = {
    top: strip('top'),
    side: sideBody,
    main: mainBody,
    aside,
    bottom: strip('bottom'),
    overlay: div({ class: 'contents' }),
  }
  const covers: Record<Coverable, HTMLElement> = { side: sideCover, main: mainCover }

  const backdrop = div({
    class: () =>
      narrow.get() && (open.side.get() || shift.get() !== undefined)
        ? [layer.drawer, 'fixed inset-0 bg-black/50', swiped.get() ? null : 'animate-fade']
        : 'hidden',
    style: () => backdropOpacity(shift.get()),
    onClick: closeSide,
  })

  const root = div(
    { class: 'absolute inset-0 flex flex-col bg-neutral-900', style: { padding: safeArea } },
    areas.top,
    backdrop,
    div({ class: 'flex min-h-0 min-w-0 flex-1' }, side, main, aside),
    areas.bottom,
    areas.overlay,
  )
  return { root, areas, covers }
}
