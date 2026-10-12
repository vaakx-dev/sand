import type { Handle, PanelPatch, PanelSpec } from '@sand/protocol'
import { collectScope, disposeAll, div, intersectionObserver, mount, span, type Child } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { place, running } from '../place'

interface PanelLook {
  paneHead(props: object, ...children: Child[]): HTMLElement
  headTitle(level: 2, title: Child): HTMLElement
  icon(name: string, size: number): Child
}

type PanelContext = Context & { kit: PanelLook }

const plainPanel = ({ headTitle, icon, paneHead }: PanelLook, spec: PanelSpec, body: HTMLElement) =>
  div(
    { class: 'flex min-h-0 w-full flex-1 flex-col' },
    paneHead({}, span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(spec.icon ?? 'panel', 16)), headTitle(2, spec.title)),
    body,
  )

const placeAside = (ctx: PanelContext, spec: PanelSpec) => {
  const body = div({ class: 'min-h-0 flex-1 overflow-auto' })
  const stop = spec.render(body)
  const unplace = place(ctx, 'aside', plainPanel(ctx.kit, spec, body), spec.order ?? 0)
  return () => {
    void unplace()
    void stop?.()
  }
}

const panelOf = (ctx: PanelContext, spec: PanelSpec) => {
  let handle: Handle<PanelPatch> | undefined
  ctx.watch('panels', panels => {
    if (!running(ctx)) return
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

export const shownPanel = (ctx: PanelContext, spec: Omit<PanelSpec, 'render'>, view: (body: HTMLElement) => HTMLElement, changed: () => void) => {
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
        mount(body, view(body))
      })
      return () => {
        visible.delete(body)
        disposeAll(scope)
      }
    },
  })
  return { update, shown: () => visible.size > 0 }
}
