import { span } from '@vaakx-dev/vrui'
import { sameScope, scopeChoices, scopeLabel } from '../scope/scopes'
import type { ViewParts } from './parts'

export const scopeMenu = ({ kit, model }: ViewParts) => {
  const { chipButton, choiceItem, dropdown, menuReason } = kit
  return dropdown({
    trigger: (press, open) =>
      chipButton(
        { active: open, menu: true, title: 'Choose which changes to show', ...press },
        span({ class: 'min-w-0 truncate' }, () => scopeLabel(model.scope.get(), model.baseLabel.get())),
      ),
    items: close =>
      scopeChoices.map(choice =>
        choiceItem(
          {
            selected: () => sameScope(model.scope.get(), choice.scope),
            icon: choice.icon,
            onClick: () => {
              close()
              model.pick(choice.scope)
            },
          },
          choice.label(model.baseLabel.get()),
          choice.detail ? menuReason(choice.detail) : null,
        ),
      ),
  })
}
