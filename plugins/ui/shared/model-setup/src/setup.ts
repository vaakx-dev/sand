import { composer } from '@sand/composer/contract'
import type { wire } from '@sand/devices-contract'
import { settingsSet } from '@sand/model/contract'
import { errorMessage } from '@sand/util'
import type { models } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export type SetupStep = 'model' | 'done'

type SetupContext = Context<{ models: typeof models; wire: typeof wire }>

export const setupState = (ctx: SetupContext) => {
  const step = sig<SetupStep | undefined>(undefined)
  const model = sig<string | undefined>(undefined)
  const busy = sig(false)
  const error = sig('')

  const close = () => {
    step.set(undefined)
    ctx.get(composer)?.focus()
  }

  const start = () => {
    model.set(ctx.models.defaults().model)
    error.set('')
    if (!model.get()) return step.set('model')
    close()
  }

  const saveModel = async () => {
    const id = model.get()
    if (!id) return
    busy.set(true)
    error.set('')
    try {
      await ctx.wire.call(settingsSet, { patch: { model: id } })
      step.set('done')
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
    start,
    saveModel: () => void saveModel(),
    skipModel: () => {
      model.set(undefined)
      step.set('done')
    },
    close,
  }
}

export type ModelSetupState = ReturnType<typeof setupState>
