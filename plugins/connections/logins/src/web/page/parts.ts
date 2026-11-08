import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, form, label, preventThen, show, sig, span, type Child, type Derive, type Props, type Resource } from '@vaakx-dev/vrui'
import { problem, task, type Task } from '../task'

export const kindIcons = { website: 'globe', key: 'key' } as const

export const rowProblem = (kit: Kit, { failure }: Task) => show(() => Boolean(failure.get()), () => kit.rowDetail(kit.errorText(() => failure.get())))

export const field = ({ metaLine, textInput }: Kit, name: string, props: Props<HTMLInputElement>) =>
  label({ class: 'flex min-w-0 flex-col gap-1' }, metaLine(name), textInput(props))

export interface FormParts {
  save: string
  ready(): boolean
  submit(): Promise<unknown>
  done?: () => void
  cancel?: () => void
}

export const editForm = (kit: Kit, { save, ready, submit, done, cancel }: FormParts, ...fields: Child[]) => {
  const work = task()
  const send = async () => {
    if (await work.run(submit)) done?.()
  }
  return form(
    {
      class: 'flex max-w-md flex-col gap-3',
      onSubmit: preventThen(() => {
        if (ready() && !work.busy.get()) void send()
      }),
    },
    ...fields,
    problem(kit, work),
    div(
      { class: 'flex flex-wrap items-center gap-3' },
      kit.primaryAction({ size: 'sm', type: 'submit', disabled: () => work.busy.get() || !ready() }, save),
      cancel ? kit.secondaryAction({ size: 'sm', onClick: cancel }, 'Cancel') : null,
    ),
  )
}

export const loadedRows = <S, T>(kit: Kit, source: Resource<S>, items: Derive<T[]>, empty: string, rows: () => HTMLElement) => {
  const { emptyState, errorState, loadingState } = kit
  const phase = derive(() => {
    if (source.error.get()) return 'failed'
    if (source.data.get() === undefined) return 'loading'
    return items.get().length ? 'rows' : 'empty'
  })
  return dynamicChild(phase, shown => {
    if (shown === 'loading') return loadingState({ flush: true })
    if (shown === 'failed') return errorState({ flush: true, text: () => errorMessage(source.error.get()), retry: source.refetch })
    if (shown === 'empty') return emptyState({ flush: true, text: empty })
    return rows()
  })
}

export interface FormRowParts {
  title: Child
  detail?: Child
  open: Child
  extra?: () => Child
}

export const formRow = (kit: Kit, { title, detail, open, extra }: FormRowParts, body: (close: () => void) => HTMLElement) => {
  const opened = sig(false)
  return div(
    { class: 'contents' },
    kit.settingsRow(
      { title, detail },
      show(
        () => !opened.get(),
        () => span({ class: 'flex items-center gap-2' }, extra?.() ?? null, kit.secondaryAction({ size: 'sm', onClick: () => opened.set(true) }, open)),
      ),
    ),
    show(opened, () => kit.rowDetail(body(() => opened.set(false)))),
  )
}

export const confirmButton = (kit: Kit, label: string, confirm: string, run: () => Promise<unknown>) => {
  const { actionTones, controlButton, secondaryAction } = kit
  const asking = sig(false)
  const busy = sig(false)
  const go = () => {
    busy.set(true)
    run().finally(() => {
      busy.set(false)
      asking.set(false)
    })
  }
  return dynamicChild(asking, ask =>
    ask
      ? span(
          { class: 'flex items-center gap-2' },
          secondaryAction({ size: 'sm', onClick: () => asking.set(false) }, 'Cancel'),
          controlButton(actionTones.danger, { size: 'sm', disabled: busy, onClick: go }, confirm),
        )
      : secondaryAction({ size: 'sm', onClick: () => asking.set(true) }, label),
  )
}
