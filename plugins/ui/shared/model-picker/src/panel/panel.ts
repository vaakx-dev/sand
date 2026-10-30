import { modelsSeen } from '@sand/accounts/contract'
import { wire } from '@sand/devices-contract'
import { derive, div, dynamicChild, effect } from '@vaakx-dev/vrui'
import type { PanelOptions, PickerTarget } from '../contract'
import type { Picker, PickerContext } from '../deps'
import { effortBar, fastRow } from './effort'
import { modelList } from './list'
import { rail } from './rail'
import { readScene } from './scene'
import { findModels, modelSearch } from './search'
import { openView, type View } from './view'

const markSeen = (ctx: PickerContext, view: View) =>
  effect(() => {
    const at = view.at.get()
    if (view.query.get() || view.seen.has(at)) return
    if (!ctx.models.sources().find(source => source.id === at)?.fresh) return
    view.seen.add(at)
    void ctx.get(wire)?.call(modelsSeen, { source: at }, ctx.models.device()).catch(() => undefined)
  })

const refocus = (view: View, node: HTMLElement) => {
  if (!view.focus || (document.activeElement && document.activeElement !== document.body)) return
  node.querySelector<HTMLElement>(`[data-focus="${CSS.escape(view.focus)}"]`)?.focus()
}

const body = (picker: Picker, target: PickerTarget, view: View, close: () => void, flash: boolean) => {
  const { loadingState } = picker.ctx.kit
  const scene = readScene(picker, target, view, close)
  if (!scene) return loadingState({ surface: 'raised' })
  return div(
    {
      class: 'flex min-h-0 flex-col',
      onFocusIn: ({ target: focused }) => {
        if (focused instanceof HTMLElement) view.focus = focused.dataset.focus ?? ''
      },
      onMount: node => refocus(view, node),
    },
    div({ class: 'flex max-h-80 min-h-0' }, rail(scene, view), modelList(scene, view)),
    effortBar(picker.ctx, scene, flash),
    fastRow(scene),
    target.extra?.(),
  )
}

export const modelPanel = (picker: Picker, target: PickerTarget, close: () => void, { flash = false }: PanelOptions = {}) => {
  const { ctx, changes, pcs } = picker
  const view = openView(ctx, target)
  markSeen(ctx, view)
  pcs.refresh()
  const pickFirst = () => {
    const scene = readScene(picker, target, view, close)
    const first = scene && findModels(scene, view.query.get()).find(model => !scene.offline(scene.source(model)))
    if (first) scene.pick(first)
  }
  return [
    modelSearch(ctx.kit, view, pickFirst),
    dynamicChild(
      derive(() => `${changes.version.get()}:${pcs.key()}:${JSON.stringify(target.shown())}:${target.key?.() ?? ''}`),
      () => body(picker, target, view, close, flash),
    ),
    view.menu.view(),
  ]
}
