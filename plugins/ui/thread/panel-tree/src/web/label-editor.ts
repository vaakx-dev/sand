import { div, keys, primaryAction, secondaryAction, stopThen, textInput } from '@sand/dom'

export const labelEditor = (value: string, done: (label: string | undefined) => void) => {
  const field = textInput({
    value,
    placeholder: 'Label (empty to remove)',
    'aria-label': 'Label',
    onMount: node => node.focus(),
    onKeyDown: stopThen(keys({ Enter: () => done(field.value), Escape: () => done(undefined) })),
  })
  return div(
    { class: 'flex shrink-0 gap-2 px-2 pt-2 pb-3' },
    field,
    secondaryAction({ onClick: () => done(undefined) }, 'Cancel'),
    primaryAction({ onClick: () => done(field.value) }, 'Save'),
  )
}
