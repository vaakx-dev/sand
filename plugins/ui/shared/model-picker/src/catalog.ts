import { modelsAdd, modelsCatalog, modelsNewModels, modelsPref, modelsRefresh, modelsRemove, modelsSeen } from '@sand/accounts/contract'
import { wire } from '@sand/devices-contract'
import type { Request } from '@sand/host-hub/contract'
import type { ModelCatalog } from './contract'
import type { PickerContext } from './deps'

export const modelCatalog = (ctx: PickerContext): ModelCatalog => {
  const call = <I, O>(request: Request<I, O>, input: I) => {
    const link = ctx.get(wire)
    return link ? link.call(request, input, ctx.models.device()) : Promise.reject(new Error('Not connected'))
  }
  return {
    list: source => call(modelsCatalog, { source }),
    add: (source, name) => call(modelsAdd, { source, name }),
    remove: model => call(modelsRemove, { model }),
    favourite: (model, favourite) => call(modelsPref, { model, favourite }),
    hide: (model, hidden) => call(modelsPref, { model, hidden }),
    showNew: (source, show) => call(modelsNewModels, { source, mode: show ? 'show' : 'hide' }),
    seen: source => call(modelsSeen, { source }),
    refresh: source => call(modelsRefresh, { source }),
  }
}
