import { collectScope, disposeAll, div, intersectionObserver, mount } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { icon } from '../icons/lucide'
import { place } from './place'
import type { Handle, PanelPatch, PanelSpec } from './types'

const plainPanel = (spec: PanelSpec, body: HTMLElement) =>
  div(
    { class: 'flex min-h-0 w-full flex-1 flex-col' },
    div({ class: 'flex h-10 shrink-0 items-center gap-2 px-4 text-xs text-neutral-300' }, icon(spec.icon ?? 'panel', 14), spec.title),
    body,
  )

const placeAside = (ctx: Context, spec: PanelSpec) => {
  const body = div({ class: 'min-h-0 flex-1 overflow-auto' })
  const stop = spec.render(body)
  const unplace = place(ctx, 'aside', plainPanel(spec, body), spec.order ?? 0)
  return () => {
    void unplace()
    void stop?.()
  }
}

const panelOf = (ctx: Context, spec: PanelSpec) => {
  let handle: Handle<PanelPatch> | undefined
  ctx.watch('panels', panels => {
    if (!panels) return placeAside(ctx, spec)
    handle = panels.panel(spec)
    return () => {
      handle?.dispose()
      handle = undefined
    }
  })
  return (patch: PanelPatch) => {
    Object.assign(spec, patch)
    handle?.update(patch)
  }
}

export const shownPanel = (ctx: Context, spec: Omit<PanelSpec, 'render'>, view: () => HTMLElement, changed: () => void) => {
  const visible = new Set<HTMLElement>()
  const seen = (body: HTMLElement, records: IntersectionObserverEntry[]) => {
    const next = records.at(-1)?.isIntersecting ?? visible.has(body)
    if (next === visible.has(body)) return
    if (next) visible.add(body)
    else visible.delete(body)
    changed()
  }
  const update = panelOf(ctx, {
    ...spec,
    render(body) {
      const { scope } = collectScope(() => {
        intersectionObserver(body, records => seen(body, records))
        mount(body, view())
      })
      return () => {
        visible.delete(body)
        disposeAll(scope)
      }
    },
  })
  return { update, shown: () => visible.size > 0 }
}
