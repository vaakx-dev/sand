import type { TitlePatch, TitleSettings } from '@sand/titles/contract'
import { errorMessage } from '@sand/kit'
import { sig } from '@vaakx-dev/vrui'
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
    namer.set(undefined)
    naming.set(true)
    error.set('')
    if (!model.get()) return step.set('model')
    if (askNamer) return step.set('names')
    close()
  }

  const saveModel = () => {
    const id = model.get()
    if (!id) return
    void save(() => ctx.wire.call({ type: 'ui.command', name: 'model', args: `${id} --default --quiet`, cwd: ctx.threads?.cwd() }), afterModel())
  }

  const saveTitles = (patch: TitlePatch) => ctx.wire.call({ type: 'titles.save', ...patch })

  const saveNamer = () => {
    const id = namer.get()
    if (id) void save(() => saveTitles({ model: id }), 'done')
  }

  const namesOff = () =>
    void save(async () => {
      await saveTitles({ auto: false })
      naming.set(false)
    }, 'done')

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
