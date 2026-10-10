import { derive, div, dynamicChild, effect, type Pulse, type Sig } from '@sand/dom'
import type { Actions, PanelContext } from '../actions'
import type { PcStatus } from '../pcs'
import { banner, fastRow, footer, usesDefaults } from './controls'
import { effortBar } from './effort'
import { modelList } from './list'
import { rail } from './rail'
import { readScene } from './scene'
import { findModels, searchField } from './search'
import { openView, type View } from './view'

export interface PanelDeps {
  changes: Pulse
  flash: Sig<boolean>
  problem: Sig<string>
  pcs: PcStatus
  close: () => void
}

const markSeen = (ctx: PanelContext, view: View) =>
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

const body = (ctx: PanelContext, actions: Actions, view: View, deps: PanelDeps) => {
  const scene = readScene(ctx, actions, view, deps.pcs, deps.close)
  if (!scene) return div({ class: 'px-3 py-4 text-xs text-neutral-500' }, 'Loading the models…')
  const { choice } = scene
  const model = ctx.models.info(choice.shown.model)
  const problem = deps.problem.get()
  return div(
    {
      class: 'flex min-h-0 flex-col pb-1',
      onFocusIn: event => {
        view.focus = (event.target as HTMLElement).dataset.focus ?? ''
      },
      onMount: node => refocus(view, node),
    },
    div({ class: 'flex h-80 min-h-0 border-b border-solid border-neutral-700' }, rail(scene, view), modelList(scene, view)),
    ctx.threads.current()?.running && banner('clock', 'A turn is running. Changes apply when it finishes.'),
    problem && banner('alert', problem),
    effortBar(choice, ctx.models.levels(), model, deps.flash, actions),
    fastRow(choice, actions),
    !usesDefaults(choice, model) && footer(choice, actions),
  )
}

export const modelPanel = (ctx: PanelContext, actions: Actions, deps: PanelDeps) => {
  const view = openView(ctx)
  markSeen(ctx, view)
  const pickFirst = () => {
    const scene = readScene(ctx, actions, view, deps.pcs, deps.close)
    const first = scene && findModels(scene, view.query.get()).find(model => !scene.offline(scene.source(model)))
    if (first) scene.pick(first)
  }
  return [
    searchField(ctx, view, pickFirst),
    dynamicChild(
      derive(() => `${deps.changes.version.get()}:${deps.problem.get()}:${deps.pcs.key()}`),
      () => body(ctx, actions, view, deps),
    ),
    view.menu.view(),
  ]
}
