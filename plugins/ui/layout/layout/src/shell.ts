import type { Kit } from '@sand/ui-kit/contract'
import type { Region } from './contract'
import { div, list, type Sig, type Store } from '@vaakx-dev/vrui'
import { grip, sizedStyle, type Widths } from './resize'
import { showing, type Phone } from './phone'
import { backdropOpacity, slide } from './slide'
import { fitArea, type VisibleArea } from './viewport'

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
  phone: Sig<Phone>
  keyboard: Sig<VisibleArea | undefined>
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

const stacked = (views: Sig<HTMLElement[]>, container: HTMLElement) =>
  list(
    views,
    view => view,
    view => div({ class: () => (views.get().at(-1) === view.get() ? 'contents' : 'hidden') }, view.get()),
    container,
  )

export const buildShell = ({ layer }: Kit, { narrow, open, views, covers, filled, covered, phone, keyboard, widths }: ShellState, closeSide: () => void) => {
  const strip = (region: 'top' | 'bottom') => placed(views[region], div({ class: () => (filled.get()[region] ? 'flex shrink-0 flex-col' : 'hidden') }))
  const shown = {
    side: () => (narrow.get() ? showing(phone.get(), 'side') : open.side.get() || covered.get().side),
    aside: () => (narrow.get() ? showing(phone.get(), 'aside') : open.aside.get()),
  }
  const animated = (name: string) => {
    const now = phone.get()
    return now.kind === 'rest' && now.animate ? name : null
  }
  const sideSized = () => !narrow.get() && Boolean(widths.get().side)
  const fill = (visible: () => boolean) => div({ class: () => (visible() ? ['contents', sideSized() && '*:w-full'] : 'hidden') })

  const side: HTMLElement = div(
    {
      class: () => {
        if (!filled.get().side || !shown.side()) return 'hidden'
        return narrow.get()
          ? [layer.drawer, 'fixed inset-y-0 left-0 flex w-80 flex-col bg-neutral-950 py-safe pl-safe shadow-xl', animated('animate-drawer')]
          : 'relative flex min-h-0 shrink-0 flex-col bg-neutral-950'
      },
      style: () => (narrow.get() ? { ...drawer, ...slide(phone.get(), 'side') } : sizedStyle(widths, 'side')),
    },
    placed(views.side, fill(() => !covered.get().side)),
    placed(covers.side, fill(() => covered.get().side)),
    grip('side', () => side, () => aside, widths, () => narrow.get()),
  )

  const main = div(
    { class: 'relative isolate flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-900' },
    placed(views.main, div({ class: 'contents' })),
    stacked(covers.main, div({ class: () => (covered.get().main ? [layer.drawer, 'absolute inset-0 flex flex-col bg-neutral-900'] : 'hidden') })),
  )

  const aside: HTMLElement = div(
    {
      class: () => {
        if (!filled.get().aside || !shown.aside() || covered.get().main) return 'hidden'
        return narrow.get()
          ? [layer.drawer, 'fixed inset-0 flex flex-col bg-neutral-950 px-safe py-safe']
          : 'relative flex min-h-0 min-w-0 w-80 shrink-0 flex-col bg-neutral-950 lg:w-96 xl:w-full xl:max-w-lg'
      },
      style: () => (narrow.get() ? slide(phone.get(), 'aside') : sizedStyle(widths, 'aside')),
    },
    placed(views.aside, div({ class: 'contents' })),
    grip('aside', () => aside, () => side, widths, () => narrow.get()),
  )

  const backdrop = div({
    class: () => (narrow.get() && filled.get().side && shown.side() ? [layer.drawer, 'fixed inset-0 bg-black/50', animated('animate-fade')] : 'hidden'),
    style: () => backdropOpacity(phone.get()),
    onClick: closeSide,
  })

  return div(
    { class: 'absolute inset-0 flex flex-col bg-neutral-900 px-safe py-safe', style: () => fitArea(keyboard.get()) },
    strip('top'),
    backdrop,
    div({ class: 'flex min-h-0 min-w-0 flex-1' }, side, main, aside),
    strip('bottom'),
    placed(views.overlay, div({ class: 'contents' })),
  )
}
