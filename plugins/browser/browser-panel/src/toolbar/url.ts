import type { Kit } from '@sand/ui-kit/contract'
import { effect, form, keys, preventThen, sig, untrack } from '@vaakx-dev/vrui'

export interface UrlParts {
  url: () => string
  title: () => string
  open(url: string): void
}

export const urlField = (kit: Kit, { url, title, open }: UrlParts) => {
  const { textInput } = kit
  const draft = sig('')
  const editing = sig(false)

  effect(() => {
    const current = url()
    if (!untrack(() => editing.get())) draft.set(current)
  })

  const field = textInput({
    type: 'text',
    inputMode: 'url',
    enterKeyHint: 'go',
    placeholder: 'Search or type a URL',
    'aria-label': 'Address',
    title,
    bindValue: draft,
    onFocus: () => {
      editing.set(true)
      field.select()
    },
    onBlur: () => {
      editing.set(false)
      draft.set(url())
    },
    onKeyDown: keys({ Escape: () => field.blur() }),
  })

  const submit = () => {
    const target = draft.get().trim()
    if (!target) return
    field.blur()
    open(target)
  }

  return form({ class: 'min-w-24 flex-1', onSubmit: preventThen(submit) }, field)
}
