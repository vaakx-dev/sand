import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, keep, list, scoped, show, untrack, type Sig } from '@vaakx-dev/vrui'
import type { PanelSpec } from './contract'
import type { Surface } from './surface'

export interface Page {
  key: number
  spec: PanelSpec
}

export interface PanelsParts {
  kit: Kit
  pages: Sig<Page[]>
  selected: Sig<string | undefined>
  surface: Surface
  toggle(): HTMLElement
  show(id: string): void
  hide(): void
}

const hasBadge = (spec: PanelSpec) => spec.badge !== undefined && spec.badge !== ''

const tabView = (page: Sig<Page>, parts: PanelsParts) => {
  const { badge, quietButton } = parts.kit
  return quietButton(
    { active: () => parts.selected.get() === page.get().spec.id, onClick: () => parts.show(page.get().spec.id) },
    page.map(value => value.spec.title),
    show(
      page.map(value => hasBadge(value.spec)),
      () => badge('accent', page.map(value => String(value.spec.badge ?? ''))),
    ),
  )
}

const pageView = (page: Sig<Page>, parts: PanelsParts) => {
  const { spec } = untrack(() => page.get())
  return keep(parts.selected.eq(spec.id), () => {
    const node = div({ class: 'absolute inset-0 overflow-auto', 'data-panel': spec.id })
    const stop = spec.render(node)
    scoped(() => void stop?.())
    return node
  })
}

const hostClass = ({ layer }: Kit, surface: Surface) => {
  if (!surface.floating()) return 'flex h-full min-h-0 min-w-0 flex-1 flex-col bg-neutral-950'
  if (!surface.drawerOpen()) return 'hidden'
  return [layer.drawer, 'fixed inset-y-0 right-0 flex w-full max-w-lg flex-col bg-neutral-950 shadow-xl animate-slide']
}

export const panelsView = (parts: PanelsParts) => {
  const { closeButton, paneHead } = parts.kit
  return div(
    { class: () => hostClass(parts.kit, parts.surface) },
    paneHead(
      {},
      div(
        { class: 'flex min-w-0 flex-1 items-center overflow-auto scrollbar-none' },
        list(parts.pages, page => page.key, page => tabView(page, parts), div({ class: 'flex gap-1' })),
      ),
      show(parts.surface.covering, () => closeButton({ title: 'Hide the panel', onClick: parts.hide })),
      show(() => !parts.surface.covering(), parts.toggle),
    ),
    list(parts.pages, page => page.key, page => pageView(page, parts), div({ class: 'relative min-h-0 flex-1' })),
  )
}

export const selectedPage = (pages: Sig<Page[]>, wanted: Sig<string | undefined>) =>
  derive(() => {
    const list = pages.get()
    return list.find(page => page.spec.id === wanted.get())?.spec.id ?? list[0]?.spec.id
  })
