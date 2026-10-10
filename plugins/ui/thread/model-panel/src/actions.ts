import type { EffectiveSettings, SettingsPatch } from '@sand/model/contract'
import { errorMessage } from '@sand/dom'
import type { Context } from 'drydock'

export type PanelContext = Context<'models' | 'threads'>

const speedWord = (speed?: string | null) => (speed === 'fast' ? 'on' : speed === 'normal' ? 'off' : 'default')

export const serverCommand = async (ctx: PanelContext, name: string, args: string) => {
  if (!ctx.wire) throw new Error(`Not connected, so /${name} cannot run`)
  await ctx.wire.call({ type: 'ui.command', name, args, session: ctx.threads.current()?.id, cwd: ctx.threads.cwd() })
}

export const createActions = (ctx: PanelContext, fail: (text: string) => void) => {
  const run = (name: string, args: string) => void serverCommand(ctx, name, args).catch(error => fail(errorMessage(error)))
  const session = () => ctx.threads.current()

  const set = (patch: SettingsPatch) => {
    if (!session()) return ctx.models.prepare(patch)
    if ('model' in patch) run('model', `${patch.model ?? 'default'} --quiet`)
    if ('effort' in patch) run('effort', `${patch.effort ?? 'default'} --quiet`)
    if ('speed' in patch) run('fast', `${speedWord(patch.speed)} --quiet`)
  }

  const reset = () => (session() ? run('model', 'reset --quiet') : ctx.models.prepare())

  const makeDefault = (shown: EffectiveSettings) => {
    if (session()) return run('model', 'save')
    const words = [shown.model, shown.chosen.effort, shown.chosen.speed].filter(Boolean).join(' ')
    run('model', `${words} --default`)
  }

  const send = (work?: Promise<unknown>) => void work?.catch(error => fail(errorMessage(error)))

  const saveModel = (model: string) =>
    send(ctx.wire?.call({ type: 'ui.command', name: 'model', args: `${model} --default --quiet`, cwd: ctx.threads.cwd() }))

  const prefer = (model: string, pref: { hidden?: boolean; favourite?: boolean }) => send(ctx.wire?.call({ type: 'models.pref', model, ...pref }))

  return { set, reset, makeDefault, run, saveModel, prefer }
}

export type Actions = ReturnType<typeof createActions>
