import type { Request } from '@sand/host-hub/contract'
import { settingsSave, settingsSet, type EffectiveSettings, type SettingsPatch } from '@sand/model/contract'
import { errorMessage } from '@sand/util'
import type { PanelContext } from './context'

export const createActions = (ctx: PanelContext, fail: (text: string) => void) => {
  const send = <I, O>(request: Request<I, O>, input: I) => void ctx.wire.call(request, input).catch(error => fail(errorMessage(error)))
  const session = () => ctx.threads.current()?.id

  const set = (patch: SettingsPatch) => send(settingsSet, { session: session(), patch })

  const reset = () => {
    const id = session()
    if (id) send(settingsSet, { session: id, patch: { model: null, effort: null, speed: null } })
  }

  const makeDefault = (shown: EffectiveSettings) => {
    const id = session()
    if (id) return send(settingsSave, { session: id })
    const { effort, speed } = shown.chosen
    send(settingsSet, { patch: { model: shown.model, ...(effort && { effort }), ...(speed && { speed }) } })
  }

  return { set, reset, makeDefault }
}

export type Actions = ReturnType<typeof createActions>
