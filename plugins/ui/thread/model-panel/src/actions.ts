import type { Speed } from '@sand/llm-accounts/contract'
import type { EffectiveSettings, SettingsPatch } from '@sand/model/contract'
import { errorMessage } from '@sand/dom'
import type { Context } from 'drydock'

export type PanelContext = Context<'models' | 'modelPicker' | 'threads'>

export const speedWords: Record<Speed, string> = { fast: 'on', normal: 'off' }

export const createActions = (ctx: PanelContext, fail: (text: string) => void) => {
  const send = (work?: Promise<unknown>) => void work?.catch(error => fail(errorMessage(error)))
  const run = (name: string, args?: string) => send(ctx.threads.command(name, args))
  const session = () => ctx.threads.current()

  const set = (patch: SettingsPatch) => {
    if (!session()) return ctx.models.prepare(patch)
    if ('model' in patch) run('model', `${patch.model ?? 'default'} --quiet`)
    if ('effort' in patch) run('effort', `${patch.effort ?? 'default'} --quiet`)
    if ('speed' in patch) run('fast', `${patch.speed ? speedWords[patch.speed] : 'default'} --quiet`)
  }

  const reset = () => (session() ? run('model', 'reset --quiet') : ctx.models.prepare())

  const makeDefault = (shown: EffectiveSettings) => {
    if (session()) return run('model', 'save')
    const words = [shown.model, shown.chosen.effort, shown.chosen.speed].filter(Boolean).join(' ')
    run('model', `${words} --default`)
  }

  return { set, reset, makeDefault, run }
}

export type Actions = ReturnType<typeof createActions>
