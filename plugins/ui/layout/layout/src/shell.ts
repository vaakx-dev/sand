import type { Kit } from '@sand/ui-kit/contract'
import type { Region, SpaceRegion, Strip } from './contract'
import { derive, div, list, type Sig, type Store } from '@vaakx-dev/vrui'
import { grip, sizedStyle, type Widths } from './resize'
import { showing, type Phone } from './phone'
import { backdropOpacity, slide } from './slide'
import { fitArea, type VisibleArea } from './viewport'

export type Open = Record<'side' | 'aside', boolean>

export type Coverable = 'side' | 'main'

export type Views<K extends string> = Record<K, Sig<HTMLElement[]>>

export interface Shelved {
  space: string
  view: HTMLElement
}

export type Shelves = Record<SpaceRegion, Sig<Shelved[]>>

export interface ShellState {
  narrow: Sig<boolean>
  open: Store<Open>
  strips: Views<Strip>
  shelves: Shelves
  active: () => string | undefined
  covers: Views<Coverable>
  filled: Sig<Record<Region, boolean>>
  covered: Sig<Record<Coverable, boolean>>
  phone: Sig<Phone>
  keyboard: Sig<VisibleArea | undefined>
  typing: Sig<boolean>
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

const shelved = (shelf: Sig<Shelved[]>, active: () => string | undefined, frame: (visible: () => boolean) => HTMLElement) =>
  list(
    derive(() => [...new Set(shelf.get().map(entry => entry.space))]),
    space => space,
    space =>
      placed(
        derive(() => shelf.get().flatMap(entry => (entry.space === space.get() ? [entry.view] : []))),
        frame(() => active() === space.get()),
      ),
    div({ class: 'contents' }),
  )

export const buildShell = ({ layer }: Kit, state: ShellState, closeSide: () => void) => {
  const { narrow, open, strips, shelves, active, covers, filled, covered, phone, keyboard, typing, widths } = state
  const strip = (region: 'top' | 'bottom') => placed(strips[region], div({ class: () => (filled.get()[region] ? 'flex shrink-0 flex-col' : 'hidden') }))
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
  const contents = (visible: () => boolean) => div({ class: () => (visible() ? 'contents' : 'hidden') })
  const railShown = () => filled.get().rail && !(narrow.get() && typing.get())
  const railAtBottom = () => narrow.get() && railShown()

  const rail = placed(
    strips.rail,
    div({
      class: () => (railShown() ? 'flex shrink-0 flex-col' : 'hidden'),
      style: () => (narrow.get() ? { order: '1' } : null),
    }),
  )

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
    shelved(shelves.side, active, visible => fill(() => visible() && !covered.get().side)),
    placed(covers.side, fill(() => covered.get().side)),
    grip('side', () => side, () => aside, widths, () => narrow.get()),
  )

  const main = div(
    { class: 'relative isolate flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-900' },
    shelved(shelves.main, active, contents),
    stacked(covers.main, div({ class: () => (covered.get().main ? [layer.drawer, 'absolute inset-0 flex flex-col bg-neutral-900'] : 'hidden') })),
  )

  const aside: HTMLElement = div(
    {
      class: () => {
        if (!filled.get().aside || !shown.aside() || covered.get().main) return 'hidden'
        return narrow.get()
          ? [layer.drawer, 'fixed inset-0 flex flex-col bg-neutral-950 px-safe py-safe', animated('animate-slide')]
          : 'relative flex min-h-0 min-w-0 w-80 shrink-0 flex-col bg-neutral-950 lg:w-96 xl:w-full xl:max-w-lg'
      },
      style: () => (narrow.get() ? slide(phone.get(), 'aside') : sizedStyle(widths, 'aside')),
    },
    shelved(shelves.aside, active, contents),
    grip('aside', () => aside, () => side, widths, () => narrow.get()),
  )

  const backdrop = div({
    class: () => (narrow.get() && filled.get().side && shown.side() ? [layer.drawer, 'fixed inset-0 bg-black/50', animated('animate-fade')] : 'hidden'),
    style: () => backdropOpacity(phone.get()),
    onClick: closeSide,
  })

  return div(
    { class: ['absolute inset-0 flex flex-col bg-neutral-900 px-safe pt-safe', () => (railAtBottom() ? null : 'pb-safe')], style: () => fitArea(keyboard.get()) },
    strip('top'),
    backdrop,
    div({ class: ['flex min-h-0 min-w-0 flex-1', () => (narrow.get() ? 'flex-col' : null)] }, rail, side, main, aside),
    strip('bottom'),
    placed(strips.overlay, div({ class: 'contents' })),
  )
}
