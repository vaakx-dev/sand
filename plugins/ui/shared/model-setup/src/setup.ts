import type { wire } from '@sand/devices-contract'
import { firstRun, type FirstRun } from '@sand/features/contract'
import { defaultsSet } from '@sand/model/contract'
import { errorMessage } from '@sand/util'
import type { models } from '@sand/web-client/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export type SetupStep = 'model' | 'done'

type SetupContext = Context<{ models: typeof models; wire: typeof wire }>

const setupSteps = 2

export const setupState = (ctx: SetupContext) => {
  const step = sig<SetupStep | undefined>(undefined)
  const model = sig<string | undefined>(undefined)
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
    model.set(ctx.models.defaults().model)
    error.set('')
    if (!model.get()) return step.set('model')
    onward()
  }

  const saveModel = async () => {
    const id = model.get()
    if (!id) return
    busy.set(true)
    error.set('')
    try {
      await ctx.wire.call(defaultsSet, { patch: { model: id } })
      finish()
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  return {
    step,
    model,
    busy,
    error,
    total,
    start,
    saveModel: () => void saveModel(),
    skipModel: () => {
      model.set(undefined)
      finish()
    },
    close,
  }
}

export type ModelSetupState = ReturnType<typeof setupState>
