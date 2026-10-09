import type { PanelSpec } from '@sand/protocol'
import { badge, derive, div, dynamicChild, icon, iconButton, keep, layer, list, quietButton, scoped, show, untrack, type Sig } from '@sand/dom'
import type { Surface } from './surface'

export interface Page {
  key: number
  spec: PanelSpec
}

export interface PanelsParts {
  pages: Sig<Page[]>
  selected: Sig<string | undefined>
  surface: Surface
  show(id: string): void
  hide(): void
}

const hasBadge = (spec: PanelSpec) => spec.badge !== undefined && spec.badge !== ''

const tabView = (page: Sig<Page>, parts: PanelsParts) =>
  quietButton(
    { active: () => parts.selected.get() === page.get().spec.id, onClick: () => parts.show(page.get().spec.id) },
    dynamicChild(
      page.map(value => value.spec.icon ?? ''),
      name => (name ? icon(name, 14) : div({ class: 'hidden' })),
    ),
    page.map(value => value.spec.title),
    show(
      page.map(value => hasBadge(value.spec)),
      () => badge('accent', page.map(value => String(value.spec.badge ?? ''))),
    ),
  )

const pageView = (page: Sig<Page>, parts: PanelsParts) => {
  const { spec } = untrack(() => page.get())
  return keep(parts.selected.eq(spec.id), () => {
    const node = div({ class: 'absolute inset-0 overflow-auto', 'data-panel': spec.id })
    const stop = spec.render(node)
    scoped(() => void stop?.())
    return node
  })
}

export const panelsView = (parts: PanelsParts) => {
  const { surface } = parts
  return div(
    {
      class: () => {
        if (!surface.floating()) return 'flex h-full min-h-0 min-w-0 flex-1 flex-col bg-neutral-950'
        return surface.drawerOpen() ? [layer.drawer, 'fixed flex w-full max-w-lg flex-col bg-neutral-950 shadow-xl animate-slide'] : 'hidden'
      },
      style: () => (surface.floating() ? { top: '0', right: '0', bottom: '0' } : null),
    },
    div(
      { class: 'flex h-12 shrink-0 items-center gap-1 pl-4 pr-3' },
      show(
        derive(() => surface.narrow()),
        () => quietButton({ onClick: parts.hide, class: 'mr-1 shrink-0 text-neutral-300' }, icon('back', 15), 'Chat'),
      ),
      div(
        { class: 'flex min-w-0 flex-1 items-center overflow-auto scrollbar-none' },
        list(parts.pages, page => page.key, page => tabView(page, parts), div({ class: 'flex gap-1' })),
      ),
      show(
        derive(() => surface.floating()),
        () => iconButton({ title: 'Close panel', onClick: parts.hide }, icon('x', 15)),
      ),
    ),
    list(parts.pages, page => page.key, page => pageView(page, parts), div({ class: 'relative min-h-0 flex-1' })),
  )
}

export const selectedPage = (pages: Sig<Page[]>, wanted: Sig<string | undefined>) =>
  derive(() => {
    const list = pages.get()
    return list.find(page => page.spec.id === wanted.get())?.spec.id ?? list[0]?.spec.id
  })
