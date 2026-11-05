import { composer } from '@sand/composer/contract'
import { settingsSet, type SettingsPatch } from '@sand/model/contract'
import { errorMessage } from '@sand/util'
import type { PanelContext } from './context'

export const createActions = (ctx: PanelContext, fail: (text: string) => void) => {
  const set = (patch: SettingsPatch) => {
    const session = ctx.threads.current()?.id
    if (!session) return ctx.get(composer)?.choose(patch)
    void ctx.wire.call(settingsSet, { session, patch }).catch(error => fail(errorMessage(error)))
  }

  const reset = () => set({ model: null, effort: null, speed: null })

  return { set, reset }
}

export type Actions = ReturnType<typeof createActions>
