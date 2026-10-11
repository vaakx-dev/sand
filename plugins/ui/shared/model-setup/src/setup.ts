import type { TitlePatch, TitleSettings } from '@sand/titles/contract'
import { errorMessage, sig } from '@sand/dom'
import type { Context } from 'drydock'

export type SetupStep = 'model' | 'names' | 'done'

type SetupContext = Context<'models' | 'wire'>

const readTitles = (ctx: SetupContext) => ctx.wire.call<TitleSettings>({ type: 'titles.get' }).catch(() => undefined)

const wantsNamer = (titles: TitleSettings | undefined) => !!titles?.auto && !titles.model

export const modelSetup = (ctx: SetupContext) => {
  const step = sig<SetupStep | undefined>(undefined)
  const model = sig<string | undefined>(undefined)
  const namer = sig<string | undefined>(undefined)
  const naming = sig(true)
  const busy = sig(false)
  const error = sig('')
  let askNamer = false

  const save = async (work: () => Promise<unknown>, next: SetupStep) => {
    busy.set(true)
    error.set('')
    try {
      await work()
      step.set(next)
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  const afterModel = (): SetupStep => (askNamer ? 'names' : 'done')

  const close = () => {
    step.set(undefined)
    ctx.composer?.focus()
  }

  const start = async () => {
    askNamer = wantsNamer(await readTitles(ctx))
    model.set(ctx.models.defaults().model)
    if (!model.get()) return step.set('model')
    if (askNamer) return step.set('names')
    close()
  }

  const saveModel = () => {
    const id = model.get()
    if (!id) return
    void save(() => ctx.wire.call({ type: 'ui.command', name: 'model', args: `${id} --default --quiet`, cwd: ctx.threads?.cwd() }), afterModel())
  }

  const saveTitles = (patch: TitlePatch) => save(() => ctx.wire.call({ type: 'titles.save', ...patch }), 'done')

  const saveNamer = () => {
    const id = namer.get()
    if (id) void saveTitles({ model: id })
  }

  const namesOff = () => {
    naming.set(false)
    void saveTitles({ auto: false })
  }

  return {
    step,
    model,
    namer,
    naming,
    busy,
    error,
    start,
    saveModel,
    skipModel: () => {
      model.set(undefined)
      step.set(afterModel())
    },
    saveNamer,
    skipNamer: () => {
      namer.set(undefined)
      step.set('done')
    },
    namesOff,
    close,
  }
}

export type ModelSetupState = ReturnType<typeof modelSetup>
