import { composer } from '@sand/composer/contract'
import type { EffectiveSettings } from '@sand/model/contract'
import type { Picked } from '@sand/model-picker/contract'
import type { PanelContext } from './context'

export interface Shown {
  current: Picked
  next?: EffectiveSettings
}

export type ShownState = () => Shown | undefined

export const shownState =
  (ctx: PanelContext): ShownState =>
  () => {
    if (ctx.threads.current()) return ctx.models.state()
    const settings = ctx.get(composer)?.settings()
    return settings ? { current: ctx.modelPicker.resolve(settings) } : ctx.models.state()
  }
