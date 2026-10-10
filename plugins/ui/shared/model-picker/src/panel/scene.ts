import type { ModelInfo, SourceInfo } from '@sand/llm-accounts/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { MenuSpec } from '@sand/dom'
import type { Picked, PickerTarget } from '../contract'
import { send, type PickerKit } from '../kit'
import { modelMenu } from '../model-menu'
import type { View } from './view'

export interface Scene {
  shown: Picked
  defaults: SessionSettings
  target: PickerTarget
  models: ModelInfo[]
  sources: SourceInfo[]
  fresh: (model: ModelInfo) => boolean
  source: (model: ModelInfo) => SourceInfo | undefined
  offline: (source?: SourceInfo) => boolean
  pick: (model: ModelInfo) => void
  menu: View['menu']
  menuOf: (model: ModelInfo) => MenuSpec
  openSettings?: () => void
}

export const readScene = ({ ctx, pcs }: PickerKit, target: PickerTarget, view: View, close: () => void): Scene | undefined => {
  const shown = target.shown()
  if (!shown) return undefined
  const sources = ctx.models.sources()
  const settings = ctx.settings
  const pick = (model: ModelInfo) => target.set({ model: model.id })
  return {
    shown,
    defaults: ctx.models.defaults(),
    target,
    models: ctx.models.list(),
    sources,
    fresh: model => Boolean(model.fresh) || view.fresh.has(model.id),
    source: model => sources.find(source => source.id === model.source),
    offline: source => (source?.via ? (pcs.online(source.via) ?? source.online) === false : false),
    pick,
    menu: view.menu,
    menuOf: model =>
      modelMenu({
        model,
        subtitle: sources.find(source => source.id === model.source)?.label,
        notify: ctx.notify,
        use: () => pick(model),
        ...(ctx.wire && {
          makeDefault: () => send(ctx, { type: 'ui.command', name: 'model', args: `${model.id} --default --quiet`, cwd: ctx.threads?.cwd() }),
          toggleFavourite: () => send(ctx, { type: 'models.pref', model: model.id, favourite: model.favourite === undefined }),
          toggleHidden: () => send(ctx, { type: 'models.pref', model: model.id, hidden: !model.hidden }),
        }),
      }),
    ...(settings && {
      openSettings: () => {
        close()
        settings.open('models')
      },
    }),
  }
}
