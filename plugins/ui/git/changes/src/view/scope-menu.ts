import { span, untrack, type Child } from '@vaakx-dev/vrui'
import type { ChangesScope } from '../contract'
import { scopeChoices, scopeLabel } from '../scope/scopes'
import type { ViewParts } from './parts'

const groupsOf = (extras: ChangesScope[]) => {
  const groups = new Map<string, ChangesScope[]>()
  for (const choice of extras) groups.set(choice.group ?? '', [...(groups.get(choice.group ?? '') ?? []), choice])
  return [...groups]
}

const itemLabel = (text: string) => span({ class: 'min-w-0 flex-1 truncate' }, text)

const extraItem = ({ kit, model }: ViewParts, choice: ChangesScope, close: () => void) =>
  kit.choiceItem(
    {
      selected: () => model.scopeId.get() === choice.id,
      icon: choice.icon,
      onClick: () => {
        close()
        model.pick(choice.id)
      },
    },
    itemLabel(choice.label),
    choice.stat ? kit.lineStat(choice.stat.add, choice.stat.del) : null,
    choice.detail ? kit.menuReason(choice.detail) : null,
  )

const extraItems = (parts: ViewParts, close: () => void): Child[] =>
  groupsOf(untrack(() => parts.model.extras.get())).flatMap(([group, choices]) => [
    parts.kit.menuSeparator(),
    group ? parts.kit.sectionHeading(group) : null,
    ...choices.map(choice => extraItem(parts, choice, close)),
  ])

export const scopeMenu = (parts: ViewParts) => {
  const { kit, model } = parts
  return kit.dropdown({
    menuClass: 'max-h-96 overflow-y-auto',
    trigger: (press, open) =>
      kit.chipButton(
        { active: open, menu: true, title: 'Choose which changes to show', ...press },
        span({ class: 'min-w-0 truncate' }, () => scopeLabel(model.scopeId.get(), model.extras.get(), model.baseLabel.get())),
      ),
    items: close => [
      ...scopeChoices.map(choice =>
        kit.choiceItem(
          {
            selected: () => model.scopeId.get() === choice.id,
            icon: choice.icon,
            title: choice.detail,
            onClick: () => {
              close()
              model.pick(choice.id)
            },
          },
          itemLabel(choice.label(model.baseLabel.get())),
        ),
      ),
      ...extraItems(parts, close),
    ],
  })
}
