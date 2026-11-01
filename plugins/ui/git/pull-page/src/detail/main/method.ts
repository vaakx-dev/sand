import type { MergeMethod } from '@sand/github/contract'
import type { Choice } from '@sand/ui-kit/contract'
import { dynamicChild, type Sig, span } from '@vaakx-dev/vrui'
import { methodNotes } from '../../pull/method'
import type { Shown } from '../shown'

const shortLabels: Record<MergeMethod, string> = { squash: 'Squash', merge: 'Merge commit', rebase: 'Rebase' }

const methodMenu = (shown: Shown, choices: Choice<MergeMethod>[], method: Sig<MergeMethod>, choose: (value: MergeMethod) => void) => {
  const { kit } = shown.parts
  return kit.dropdown({
    class: 'shrink-0',
    trigger: (press, open) =>
      kit.chipButton({ ...press, active: open, menu: true, 'aria-label': 'Merge method' }, span({ class: 'min-w-0 truncate' }, () => shortLabels[method.get()])),
    items: close =>
      choices.map(choice =>
        kit.choiceItem(
          {
            selected: () => method.get() === choice.value,
            title: methodNotes[choice.value],
            onClick: () => {
              choose(choice.value)
              close()
            },
          },
          span({ class: 'min-w-0 flex-1 truncate' }, choice.label),
        ),
      ),
  })
}

export const methodPicker = (shown: Shown, method: Sig<MergeMethod>, choose: (value: MergeMethod) => void) => {
  const { parts } = shown
  const methods = shown.pull().methods
  if (methods.length < 2) return null
  const choices: Choice<MergeMethod>[] = methods.map(value => ({ value, label: shortLabels[value], title: methodNotes[value] }))
  return dynamicChild(parts.narrow, narrow =>
    narrow ? methodMenu(shown, choices, method, choose) : parts.kit.segmented(choices, method, choose, { label: 'Merge method' }),
  )
}
