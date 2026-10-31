import { span, untrack, type Child } from '@vaakx-dev/vrui'
import type { ChangesScope } from '../contract'
import { scopeChoices, scopeLabel } from '../scope/scopes'
import type { ViewParts } from './parts'

const groupsOf = (extras: ChangesScope[]) => {
  const groups = new Map<string, ChangesScope[]>()
  for (const choice of extras) groups.set(choice.group ?? '', [...(groups.get(choice.group ?? '') ?? []), choice])
  return [...groups]
}

const extraItem = ({ kit, model }: ViewParts, choice: ChangesScope, close: () => void) => {
  const { add, del } = choice.stat ?? { add: 0, del: 0 }
  return kit.choiceItem(
    {
      selected: () => model.scopeId.get() === choice.id,
      icon: choice.icon,
      onClick: () => {
        close()
        model.pick(choice.id)
      },
    },
    span(
      { class: 'flex min-w-0 flex-1 items-center gap-3' },
      span({ class: 'min-w-0 flex-1 truncate' }, choice.label),
      choice.stat ? kit.lineStat(add, del) : null,
    ),
    choice.detail ? kit.menuReason(choice.detail) : null,
  )
}

const extraItems = (parts: ViewParts, close: () => void): Child[] =>
  groupsOf(untrack(() => parts.model.extras.get())).flatMap(([group, choices]) => [
    parts.kit.menuSeparator(),
    group ? parts.kit.sectionHeading(group) : null,
    ...choices.map(choice => extraItem(parts, choice, close)),
  ])

export const scopeMenu = (parts: ViewParts) => {
  const { kit, model } = parts
  const { chipButton, choiceItem, dropdown, menuReason } = kit
  return dropdown({
    menuClass: 'max-h-96 overflow-y-auto',
    trigger: (press, open) =>
      chipButton(
        { active: open, menu: true, title: 'Choose which changes to show', ...press },
        span({ class: 'min-w-0 truncate' }, () => scopeLabel(model.scopeId.get(), model.extras.get(), model.baseLabel.get())),
      ),
    items: close => [
      ...scopeChoices.map(choice =>
        choiceItem(
          {
            selected: () => model.scopeId.get() === choice.id,
            icon: choice.icon,
            onClick: () => {
              close()
              model.pick(choice.id)
            },
          },
          choice.label(model.baseLabel.get()),
          choice.detail ? menuReason(choice.detail) : null,
        ),
      ),
      ...extraItems(parts, close),
    ],
  })
}
