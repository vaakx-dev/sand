import type { ModelInfo, SourceInfo } from '@sand/llm-accounts/contract'
import type { EffectiveSettings, SessionSettings } from '@sand/model/contract'
import type { MenuSpec } from '@sand/dom'
import type { Actions, PanelContext } from '../actions'
import { modelMenu } from '../model-menu'
import type { PcStatus } from '../pcs'
import type { View } from './view'

export interface Choice {
  shown: EffectiveSettings
  current: EffectiveSettings
  pending: boolean
  defaults: SessionSettings
}

export interface Scene {
  choice: Choice
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

export const readScene = (ctx: PanelContext, actions: Actions, view: View, pcs: PcStatus, close: () => void): Scene | undefined => {
  const state = ctx.models.state()
  if (!state) return undefined
  const sources = ctx.models.sources()
  const settings = ctx.settings
  const pick = (model: ModelInfo) => actions.set({ model: model.id })
  return {
    choice: { shown: state.next ?? state.current, current: state.current, pending: Boolean(state.next), defaults: ctx.models.defaults() },
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
          makeDefault: () => actions.saveModel(model.id),
          toggleFavourite: () => actions.prefer(model.id, { favourite: model.favourite === undefined }),
          toggleHidden: () => actions.prefer(model.id, { hidden: !model.hidden }),
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
