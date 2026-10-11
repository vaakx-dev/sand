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
    { class: 'flex shrink-0 gap-2 px-3 pt-2 pb-3' },
    field,
    primaryAction({ onClick: () => done(field.value) }, 'Save'),
    secondaryAction({ onClick: () => done(undefined) }, 'Cancel'),
  )
}
