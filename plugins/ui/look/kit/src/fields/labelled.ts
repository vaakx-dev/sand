import { div, label as labelTag, p, read, show, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { metaLook } from '../heads/text'
import { errorText } from '../notes/notes'

export interface FieldProps {
  label: Child
  hint?: Child
  error?: MaybeReactive<string | undefined>
}

const labelable = (control: Child) => control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement

const failure = (error: MaybeReactive<string | undefined>) =>
  show(
    () => Boolean(read(error)),
    () => errorText(() => read(error) ?? ''),
  )

export const field = ({ label, hint, error }: FieldProps, control: Child) =>
  (labelable(control) ? labelTag : div)(
    { class: 'flex min-w-0 flex-col gap-1' },
    span({ class: metaLook }, label),
    control,
    hint ? p({ class: metaLook }, hint) : null,
    error === undefined ? null : failure(error),
  )
