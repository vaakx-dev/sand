import type { Pulse } from '@sand/reactive'
import type { SheetSpec } from '@sand/ui-shell/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, show, sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { openAt } from '../settings/actions'
import { matchChoice, pcChoice, sourceChoice } from './choices'
import { folderList } from './folders'
import { addForm } from './form'
import { plan, type Target } from './plan'

export type Added = (target: Target) => unknown

interface Failure {
  typed: string
  text: string
}

const addModel = (ctx: ProjectsContext, changes: Pulse, added?: Added) => {
  const form = addForm(ctx, changes)
  const step = derive(() => plan(ctx, form))
  const busy = sig(false)
  const failure = sig<Failure | undefined>(undefined)
  const typed = derive(() => {
    const device = form.device.get()
    const draft = device ? form.draftOf(device) : undefined
    return [device, form.kind.get(), draft?.path.get(), draft?.name.get(), form.match.get()?.project].join('\n')
  })
  const note = derive(() => {
    const failed = failure.get()
    if (failed?.typed === typed.get()) return { text: failed.text, error: true }
    const { note: text, error = false } = step.get()
    return text ? { text, error } : undefined
  })
  const go = async (close: () => void) => {
    const { run, opens, label } = step.get()
    if (!run || busy.get()) return
    busy.set(true)
    const at = typed.get()
    const target = await run().catch((error: unknown) => {
      failure.set({ typed: at, text: `Couldn’t ${label.toLowerCase()} (${errorMessage(error)}). Check what you entered and try again.` })
      return undefined
    })
    busy.set(false)
    if (!target) return
    close()
    await (opens ? openAt(ctx, target) : added?.(target))
  }
  return { form, step, busy, note, go }
}

type AddModel = ReturnType<typeof addModel>

const noteView = (ctx: ProjectsContext, { note }: AddModel) =>
  dynamicChild(note, shown => {
    if (!shown) return null
    return shown.error ? ctx.kit.errorText(shown.text) : ctx.kit.sheetText(shown.text)
  })

const body = (ctx: ProjectsContext, model: AddModel, close: () => void) => {
  const submit = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) void model.go(close)
  }
  return div(
    { class: 'contents', onKeyDown: submit },
    pcChoice(ctx.kit, model.form),
    sourceChoice(ctx.kit, model.form),
    matchChoice(ctx.kit, model.form, model.step),
    noteView(ctx, model),
    folderList(ctx, model.form),
  )
}

const foot = (ctx: ProjectsContext, { busy, step, go }: AddModel, close: () => void) =>
  ctx.kit.primaryAction(
    { disabled: () => busy.get() || !step.get().run, onClick: () => void go(close) },
    show(busy, () => ctx.kit.spinner()),
    () => step.get().label,
  )

export const addSheet = (ctx: ProjectsContext, changes: Pulse, added?: Added): SheetSpec => {
  let model: AddModel | undefined
  const shown = () => (model ??= addModel(ctx, changes, added))
  return {
    label: 'Add a project',
    head: () => ctx.kit.headTitle(2, 'Add a project'),
    body: close => body(ctx, shown(), close),
    foot: close => foot(ctx, shown(), close),
  }
}
