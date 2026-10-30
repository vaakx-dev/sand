import { modelsPref, modelsRefresh, type ModelInfo, type SourceInfo } from '@sand/accounts/contract'
import type { Request } from '@sand/host-hub/contract'
import { settingsSet, type SessionSettings } from '@sand/model/contract'
import { settings as settingsPages } from '@sand/settings/contract'
import { pcMarks, wire } from '@sand/devices-contract'
import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import type { Child } from '@vaakx-dev/vrui'
import type { Picked, PickerTarget } from '../contract'
import type { Picker, PickerContext } from '../deps'
import { modelMenu } from '../model-menu'
import type { View } from './view'

export interface Scene {
  kit: Kit
  shown: Picked
  defaults: SessionSettings
  target: PickerTarget
  models: ModelInfo[]
  sources: SourceInfo[]
  fresh: (model: ModelInfo) => boolean
  source: (model: ModelInfo) => SourceInfo | undefined
  offline: (source?: SourceInfo) => boolean
  pcDot: (source: SourceInfo) => Child
  pick: (model: ModelInfo) => void
  refresh: (source: SourceInfo) => void
  menu: View['menu']
  menuOf: (model: ModelInfo) => MenuSpec
  openSettings?: () => void
}

const send = <I>(ctx: PickerContext, request: Request<I, unknown>, input: I) =>
  void ctx.get(wire)?.call(request, input, ctx.models.device()).catch(() => {})

export const readScene = ({ ctx, pcs }: Picker, target: PickerTarget, view: View, close: () => void): Scene | undefined => {
  const shown = target.shown()
  if (!shown) return undefined
  const sources = ctx.models.sources()
  const settings = ctx.get(settingsPages)
  const pick = (model: ModelInfo) => {
    target.set({ model: model.id })
    close()
  }
  const sourceOf = (model: ModelInfo) => sources.find(source => source.id === model.source)
  return {
    kit: ctx.kit,
    shown,
    defaults: ctx.models.defaults(),
    target,
    models: ctx.models.list(),
    sources,
    fresh: model => Boolean(model.fresh) || view.fresh.has(model.id),
    source: sourceOf,
    offline: source => (source?.pc ? (pcs.online(source.pc) ?? source.online) === false : false),
    pcDot: source => (source.pc ? (ctx.get(pcMarks)?.dot(source.pc) ?? ctx.kit.dot(source.online === false ? 'neutral' : 'success')) : null),
    pick,
    refresh: source => send(ctx, modelsRefresh, { source: source.id }),
    menu: view.menu,
    menuOf: model =>
      modelMenu(ctx.kit, {
        model,
        use: () => pick(model),
        ...(ctx.get(wire) && {
          makeDefault: () => send(ctx, settingsSet, { patch: { model: model.id } }),
          toggleFavourite: () => send(ctx, modelsPref, { model: model.id, favourite: model.favourite === undefined }),
          toggleHidden: () => send(ctx, modelsPref, { model: model.id, hidden: !model.hidden }),
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
