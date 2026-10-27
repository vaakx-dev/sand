import type { Kit } from '@sand/ui-kit/contract'
import type { Region } from './contract'
import { div, list, type Sig, type Store } from '@vaakx-dev/vrui'
import { grip, sizedStyle, type Widths } from './resize'
import { backdropOpacity, slideAside, slideSide, type Shift } from './slide'

export type Open = Record<'side' | 'aside', boolean>

export type Coverable = 'side' | 'main'

export type Views<K extends string> = Record<K, Sig<HTMLElement[]>>

export interface ShellState {
  narrow: Sig<boolean>
  open: Store<Open>
  views: Views<Region>
  covers: Views<Coverable>
  filled: Sig<Record<Region, boolean>>
  covered: Sig<Record<Coverable, boolean>>
  shift: Sig<Shift | undefined>
  swiped: Sig<boolean>
  widths: Widths
}

const drawer = { maxWidth: '85vw' }

const placed = (views: Sig<HTMLElement[]>, container: HTMLElement) =>
  list(
    views,
    view => view,
    view => view.get(),
    container,
  )

export const buildShell = ({ layer }: Kit, { narrow, open, views, covers, filled, covered, shift, swiped, widths }: ShellState, closeSide: () => void) => {
  const strip = (region: 'top' | 'bottom') => placed(views[region], div({ class: () => (filled.get()[region] ? 'flex shrink-0 flex-col' : 'hidden') }))
  const showSide = () => open.side.get() || (!narrow.get() && covered.get().side)
  const dragged = () => (narrow.get() ? shift.get()?.shown : undefined)
  const sideSized = () => !narrow.get() && Boolean(widths.get().side)
  const fill = (shown: () => boolean) => div({ class: () => (shown() ? ['contents', sideSized() && '*:w-full'] : 'hidden') })

  const side: HTMLElement = div(
    {
      class: () => {
        if (!filled.get().side || !(showSide() || dragged()?.side)) return 'hidden'
        return narrow.get()
          ? [layer.drawer, 'fixed inset-y-0 left-0 flex w-80 flex-col bg-neutral-950 pt-safe shadow-xl', swiped.get() ? null : 'animate-drawer']
          : 'relative flex min-h-0 shrink-0 flex-col bg-neutral-950'
      },
      style: () => (narrow.get() ? { ...drawer, ...slideSide(shift.get()) } : sizedStyle(widths, 'side')),
    },
    placed(views.side, fill(() => !covered.get().side)),
    placed(covers.side, fill(() => covered.get().side)),
    grip('side', () => side, () => aside, widths, () => narrow.get()),
  )

  const main = div(
    { class: 'relative isolate flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-900' },
    placed(views.main, div({ class: 'contents' })),
    placed(covers.main, div({ class: () => (covered.get().main ? [layer.drawer, 'absolute inset-0 flex flex-col bg-neutral-900'] : 'hidden') })),
  )

  const aside: HTMLElement = div(
    {
      class: () => {
        if (!filled.get().aside || !(open.aside.get() || dragged()?.aside) || covered.get().main) return 'hidden'
        return narrow.get()
          ? [layer.drawer, 'fixed inset-0 flex flex-col bg-neutral-950 py-safe']
          : 'relative flex min-h-0 min-w-0 w-80 shrink-0 flex-col bg-neutral-950 lg:w-96 xl:w-full xl:max-w-lg'
      },
      style: () => (narrow.get() ? slideAside(shift.get()) : sizedStyle(widths, 'aside')),
    },
    placed(views.aside, div({ class: 'contents' })),
    grip('aside', () => aside, () => side, widths, () => narrow.get()),
  )

  const backdrop = div({
    class: () =>
      narrow.get() && (open.side.get() || shift.get() !== undefined)
        ? [layer.drawer, 'fixed inset-0 bg-black/50', swiped.get() ? null : 'animate-fade']
        : 'hidden',
    style: () => backdropOpacity(shift.get()),
    onClick: closeSide,
  })

  return div(
    { class: 'absolute inset-0 flex flex-col bg-neutral-900 px-safe py-safe' },
    strip('top'),
    backdrop,
    div({ class: 'flex min-h-0 min-w-0 flex-1' }, side, main, aside),
    strip('bottom'),
    placed(views.overlay, div({ class: 'contents' })),
  )
}
