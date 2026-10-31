import { div, dynamicChild, keys, sig } from '@vaakx-dev/vrui'
import type { Shown } from './shown'

const titleText = (shown: Shown) => div({ class: 'min-w-0 flex-1 text-base font-medium text-neutral-100 wrap-anywhere' }, () => shown.pull().title)

const titleField = (shown: Shown, done: () => void) => {
  const { kit } = shown.parts
  const draft = sig(shown.pull().title)
  const save = async () => {
    const title = draft.get().trim()
    if (!title || title === shown.pull().title) return done()
    if (await shown.actions.edit({ title })) done()
  }
  return kit.textInput({
    bindValue: draft,
    'aria-label': 'Title',
    disabled: shown.model.busy,
    onMount: node => node.select(),
    onKeyDown: keys({ Enter: () => void save(), Escape: done }),
    onBlur: done,
  })
}

export const pullTitle = (shown: Shown) => {
  const { kit } = shown.parts
  const editing = sig(false)
  return dynamicChild(editing, on =>
    on
      ? titleField(shown, () => editing.set(false))
      : div(
          { class: 'flex min-w-0 items-start gap-1' },
          titleText(shown),
          shown.pull().canEdit
            ? kit.iconButton({ size: 'sm', title: 'Edit title', 'aria-label': 'Edit title', onClick: () => editing.set(true) }, kit.icon('pencil', 14))
            : null,
        ),
  )
}
