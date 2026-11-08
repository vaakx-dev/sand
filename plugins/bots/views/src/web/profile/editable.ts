import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { div, dynamicChild, section, show, sig, type Child } from '@vaakx-dev/vrui'

export interface EditableProps {
  title: string
  text(): string
  view(): Child
  save(text: string): Promise<unknown>
  rows?: number
  maxLength: number
  placeholder: string
}

export const block = (kit: Kit, title: string, action: Child, ...children: Child[]) =>
  section(
    { class: 'flex flex-col gap-1' },
    div({ class: 'flex min-h-8 items-center gap-2' }, kit.headTitle(2, title), action),
    ...children,
  )

export const editable = (kit: Kit, props: EditableProps) => {
  const editing = sig(false)
  const draft = sig('')
  const saving = sig(false)
  const failure = sig('')
  const start = () => {
    draft.set(props.text())
    failure.set('')
    editing.set(true)
  }
  const save = () => {
    saving.set(true)
    props
      .save(draft.get())
      .then(
        () => editing.set(false),
        error => failure.set(errorMessage(error)),
      )
      .finally(() => saving.set(false))
  }
  const editor = () =>
    div(
      { class: 'flex flex-col gap-2' },
      kit.textArea({ bindValue: draft, rows: props.rows ?? 6, maxLength: props.maxLength, placeholder: props.placeholder, 'aria-label': props.title, onMount: node => node.focus() }),
      show(
        () => Boolean(failure.get()),
        () => kit.errorText(() => failure.get()),
      ),
      div(
        { class: 'flex justify-end gap-2' },
        kit.quietButton({ size: 'sm', onClick: () => editing.set(false) }, 'Cancel'),
        kit.primaryAction({ size: 'sm', disabled: () => saving.get() || draft.get() === props.text(), onClick: save }, 'Save'),
      ),
    )
  return block(
    kit,
    props.title,
    show(
      () => !editing.get(),
      () => kit.linkButton({ class: 'text-sm', onClick: start }, 'Edit'),
    ),
    dynamicChild(editing, open => (open ? editor() : div({ class: 'text-sm text-neutral-400' }, props.view()))),
  )
}
