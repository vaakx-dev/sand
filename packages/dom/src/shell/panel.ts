import type { Handle, PanelPatch, PanelSpec } from '@sand/protocol'
import { div } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { icon } from '../icons/lucide'
import { place } from './place'

export interface PanelControl {
  update(patch: PanelPatch): void
}

const plainPanel = (spec: PanelSpec, body: HTMLElement) =>
  div(
    { class: 'flex min-h-0 w-full flex-1 flex-col' },
    div(
      { class: 'flex h-10 shrink-0 items-center gap-2 px-4 text-xs text-neutral-300' },
      icon(spec.icon ?? 'panel', 14),
      spec.title,
    ),
    body,
  )

export const asPanel = (ctx: Context, spec: PanelSpec): PanelControl => {
  let handle: Handle<PanelPatch> | undefined
  ctx.watch('panels', panels => {
    if (panels) {
      handle = panels.panel(spec)
      return () => {
        handle?.dispose()
        handle = undefined
      }
    }
    const body = div({ class: 'min-h-0 flex-1 overflow-auto' })
    const stop = spec.render(body)
    const unplace = place(ctx, 'aside', plainPanel(spec, body), spec.order ?? 0)
    return () => {
      void unplace()
      void stop?.()
    }
  })
  return {
    update(patch) {
      Object.assign(spec, patch)
      handle?.update(patch)
    },
  }
}
