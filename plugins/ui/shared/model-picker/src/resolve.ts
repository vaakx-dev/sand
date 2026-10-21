import type { ModelInfo } from '@sand/accounts/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { Picked } from './contract'
import type { PickerContext } from './deps'

const effortOf = (settings: SessionSettings, model?: ModelInfo) => {
  if (!model?.efforts.length) return undefined
  return settings.effort && model.efforts.includes(settings.effort) ? settings.effort : model.defaultEffort
}

export const resolve = (ctx: PickerContext, settings: SessionSettings): Picked => {
  const model = ctx.models.info(settings.model)
  const effort = effortOf(settings, model)
  return {
    model: settings.model,
    ...(effort && { effort }),
    speed: model?.fast && settings.speed === 'fast' ? 'fast' : 'normal',
    supportsEffort: Boolean(model?.efforts.length),
    supportsFast: Boolean(model?.fast),
  }
}
