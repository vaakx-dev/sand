import type { Kit } from '@sand/ui-kit/contract'
import { div, keys, stopThen } from '@vaakx-dev/vrui'

export const labelEditor = ({ primaryAction, secondaryAction, textInput }: Kit, value: string, done: (label: string | undefined) => void) => {
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
