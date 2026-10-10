import type { SessionSettings } from '@sand/model/contract'
import type { Picked } from './contract'
import type { PickerContext } from './kit'

export const resolve = (ctx: PickerContext, settings: SessionSettings): Picked => {
  const model = ctx.models.info(settings.model)
  const efforts = model?.efforts ?? []
  const effort = settings.effort && efforts.includes(settings.effort) ? settings.effort : model?.defaultEffort
  return {
    model: settings.model,
    ...(efforts.length && effort && { effort }),
    speed: model?.fast && settings.speed === 'fast' ? 'fast' : 'normal',
    supportsEffort: efforts.length > 0,
    supportsFast: Boolean(model?.fast),
  }
}
