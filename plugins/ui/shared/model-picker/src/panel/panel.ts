import { derive, div, dynamicChild, effect } from '@sand/dom'
import type { PanelOptions, PickerTarget } from '../contract'
import type { PickerKit } from '../kit'
import { effortBar, fastRow } from './effort'
import { modelList } from './list'
import { rail } from './rail'
import { readScene } from './scene'
import { findModels, searchField } from './search'
import { openView, type View } from './view'

const markSeen = ({ ctx }: PickerKit, view: View) =>
  effect(() => {
    const at = view.at.get()
    if (view.query.get() || view.seen.has(at)) return
    if (!ctx.models.sources().find(source => source.id === at)?.fresh) return
    view.seen.add(at)
    void ctx.wire?.call({ type: 'models.seen', source: at }).catch(() => undefined)
  })

const refocus = (view: View, node: HTMLElement) => {
  if (!view.focus || (document.activeElement && document.activeElement !== document.body)) return
  node.querySelector<HTMLElement>(`[data-focus="${CSS.escape(view.focus)}"]`)?.focus()
}

const body = (kit: PickerKit, target: PickerTarget, view: View, close: () => void, options: PanelOptions) => {
  const scene = readScene(kit, target, view, close)
  if (!scene) return div({ class: 'px-3 py-4 text-xs text-neutral-500' }, 'Loading the models…')
  const { shown } = scene
  const model = kit.ctx.models.info(shown.model)
  return div(
    {
      class: 'flex min-h-0 flex-col pb-1',
      onFocusIn: event => {
        view.focus = (event.target as HTMLElement).dataset.focus ?? ''
      },
      onMount: node => refocus(view, node),
    },
    div({ class: 'flex max-h-80 min-h-0 border-b border-solid border-neutral-700' }, rail(scene, view), modelList(scene, view)),
    effortBar(shown, kit.ctx.models.levels(), model, options.flash ?? false, target),
    fastRow(shown, target),
    target.extra?.() ?? null,
  )
}

export const modelPanel = (kit: PickerKit, target: PickerTarget, close: () => void, options: PanelOptions = {}) => {
  const view = openView(kit.ctx, target)
  markSeen(kit, view)
  kit.pcs.refresh()
  const pickFirst = () => {
    const scene = readScene(kit, target, view, close)
    const first = scene && findModels(scene, view.query.get()).find(model => !scene.offline(scene.source(model)))
    if (first) scene.pick(first)
  }
  return [
    searchField(view, pickFirst),
    dynamicChild(
      derive(() => `${kit.changes.version.get()}:${kit.pcs.key()}:${JSON.stringify(target.shown())}:${target.key?.() ?? ''}`),
      () => body(kit, target, view, close, options),
    ),
    view.menu.view(),
  ]
}
