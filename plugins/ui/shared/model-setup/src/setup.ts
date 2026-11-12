import type { wire } from '@sand/devices-contract'
import { firstRun, type FirstRun } from '@sand/features/contract'
import { defaultsSet, type SessionSettings, type SettingsPatch } from '@sand/model/contract'
import { errorMessage } from '@sand/util'
import type { models } from '@sand/web-client/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export type SetupStep = 'model' | 'done'

type SetupContext = Context<{ models: typeof models; wire: typeof wire }>

const setupSteps = 2

export const setupState = (ctx: SetupContext) => {
  const step = sig<SetupStep | undefined>(undefined)
  const choice = sig<SessionSettings>({})
  const busy = sig(false)
  const error = sig('')
  const run = sig<FirstRun | undefined>(undefined)
  ctx.watch(firstRun, value => run.set(value))
  const total = derive(() => setupSteps + (run.get()?.steps().length ?? 0))

  const close = () => step.set(undefined)

  const onward = () => {
    close()
    run.get()?.start()
  }

  const finish = () => {
    if (run.get()?.steps().length) return onward()
    step.set('done')
  }

  const start = () => {
    choice.set(ctx.models.defaults())
    error.set('')
    if (!choice.get().model) return step.set('model')
    onward()
  }

  const choose = ({ model, effort, speed }: SettingsPatch) =>
    choice.update(current => ({ ...current, ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }))

  const saveModel = async () => {
    const patch = choice.get()
    if (!patch.model) return
    busy.set(true)
    error.set('')
    try {
      await ctx.wire.call(defaultsSet, { patch })
      finish()
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  return {
    step,
    choice,
    choose,
    busy,
    error,
    total,
    start,
    saveModel: () => void saveModel(),
    skipModel: () => {
      choice.set({})
      finish()
    },
    close,
  }
}

export type ModelSetupState = ReturnType<typeof setupState>
