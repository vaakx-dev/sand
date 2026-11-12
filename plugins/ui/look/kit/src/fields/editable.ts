import { errorMessage } from '@sand/util'
import { div, dynamicChild, show, sig, type Child } from '@vaakx-dev/vrui'
import { linkButton, primaryAction, quietButton } from '../buttons/button'
import { errorText } from '../notes/notes'
import { pageSection } from '../rows/section'
import { textArea } from './field'

export interface EditableProps {
  title: string
  text(): string
  view(): Child
  save(text: string): Promise<unknown>
  rows?: number
  maxLength: number
  placeholder: string
}

export const editable = (props: EditableProps) => {
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
      textArea({ bindValue: draft, rows: props.rows ?? 6, maxLength: props.maxLength, placeholder: props.placeholder, 'aria-label': props.title, onMount: node => node.focus() }),
      show(
        () => Boolean(failure.get()),
        () => errorText(() => failure.get()),
      ),
      div(
        { class: 'flex justify-end gap-2' },
        quietButton({ size: 'sm', onClick: () => editing.set(false) }, 'Cancel'),
        primaryAction({ size: 'sm', disabled: () => saving.get() || draft.get() === props.text(), onClick: save }, 'Save'),
      ),
    )
  return pageSection(
    {
      title: props.title,
      action: show(
        () => !editing.get(),
        () => linkButton({ class: 'text-sm', onClick: start }, 'Edit'),
      ),
    },
    dynamicChild(editing, open => (open ? editor() : div({ class: 'text-sm text-neutral-400' }, props.view()))),
  )
}
