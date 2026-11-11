import type { ModelTarget } from '@sand/model-panel/contract'
import { applyChoice, effective } from './models'
import type { Parts } from './parts'

export const modelTarget = (parts: Parts, id: string): ModelTarget => {
  const bot = () => parts.store.find(id)
  return {
    settings: () => effective(bot()?.models.main ?? {}, parts.defaults.get()),
    choose: patch => {
      const models = bot()?.models
      if (models) void parts.store.update(id, { models: { ...models, main: applyChoice(models.main, patch) } }).catch(error => parts.ctx.report(error))
    },
    running: () => bot()?.status === 'working' || bot()?.status === 'waiting',
  }
}
