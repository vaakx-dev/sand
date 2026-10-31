import type { InboxView } from '@sand/pull-inbox/contract'
import type { Choice } from '@sand/ui-kit/contract'
import { type Child, div, type Sig, show, span } from '@vaakx-dev/vrui'
import type { StateFilter } from '../address/query'
import type { PageParts } from '../parts'
import { pageColumn } from './column'

const stateChoices: { value: StateFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'merged', label: 'Merged' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All states' },
]

const viewChoices = (parts: PageParts): Choice<InboxView>[] => [
  {
    value: 'needs',
    label: 'Needs you',
    title: 'Your turn, ready to merge and waiting',
    mark: show(
      () => parts.count.get() > 0,
      () => parts.kit.countMark(parts.count),
    ),
  },
  { value: 'mine', label: 'Mine', title: 'Pull requests you opened' },
  { value: 'reviewing', label: 'Reviewing', title: 'Pull requests that ask for your review' },
  { value: 'all', label: 'All', title: "Every pull request you're involved in" },
]

interface ChipChoice<T extends string = string> {
  value: T
  label: string
}

const filterChip = <T extends string>(parts: PageParts, chosen: Sig<T>, choices: () => ChipChoice<T>[], name: string) => {
  const { kit } = parts
  const label = () => choices().find(choice => choice.value === chosen.get())?.label ?? choices()[0]?.label ?? ''
  return kit.dropdown({
    placement: 'below-right',
    trigger: (press, open) => kit.chipButton({ ...press, active: open, menu: true, 'aria-label': name }, span({ class: 'min-w-0 truncate' }, label)),
    items: close =>
      choices().map(choice =>
        kit.choiceItem(
          {
            selected: () => chosen.get() === choice.value,
            onClick: () => {
              chosen.set(choice.value)
              close()
            },
          },
          span({ class: 'min-w-0 flex-1 truncate' }, choice.label),
        ),
      ),
  })
}

const projectChoices = (parts: PageParts): ChipChoice[] => [
  { value: '', label: 'All projects' },
  ...parts.repos.get().map(choice => ({ value: choice.project, label: choice.name })),
]

export const filtersRow = (parts: PageParts): Child => {
  const { kit, query } = parts
  return div(
    { class: ['flex flex-wrap items-center gap-2 px-4 pb-2', pageColumn(parts)] },
    kit.segmented(viewChoices(parts), query.view, value => query.view.set(value), { label: 'Which pull requests' }),
    span({ class: 'flex-1' }),
    show(
      () => query.view.get() !== 'needs',
      () => filterChip(parts, query.state, () => stateChoices, 'State'),
    ),
    filterChip(parts, query.project, () => projectChoices(parts), 'Project'),
  )
}
