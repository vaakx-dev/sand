import type { MergeMethod } from '@sand/github/contract'
import { dynamicChild, sig, type Sig, span } from '@vaakx-dev/vrui'
import { confirmStep } from '../../confirm/step'
import { chosenMethod, methodLabels, methodNotes, rememberMethod } from '../../pull/method'
import type { Shown } from '../shown'

export interface MergeOptions {
  auto: boolean
  blocked?: string
}

const methodItems = (shown: Shown, method: Sig<MergeMethod>, close: () => void) => {
  const { kit } = shown.parts
  const pull = shown.pull()
  return pull.methods.map(choice =>
    kit.choiceItem(
      {
        selected: () => method.get() === choice,
        onClick: () => {
          method.set(choice)
          rememberMethod(pull.repo, choice)
          close()
        },
      },
      span({ class: 'min-w-0 flex-1 truncate' }, methodLabels[choice]),
      kit.menuReason(methodNotes[choice]),
    ),
  )
}

export const mergeSplit = (shown: Shown, { auto, blocked }: MergeOptions) => {
  const { parts, model, actions } = shown
  const pull = shown.pull()
  const method = sig<MergeMethod>(chosenMethod(pull.repo, pull.methods))
  const confirm = confirmStep()
  const press = () => {
    if (auto) return void actions.merge(method.get(), true)
    confirm.press(() => void actions.merge(method.get()))
  }
  const label = () => {
    if (confirm.armed.get()) return 'Confirm merge?'
    return auto ? 'Merge when ready' : methodLabels[method.get()]
  }
  const title = () => (auto ? `GitHub merges it (${methodLabels[method.get()].toLowerCase()}) once the checks pass` : (blocked ?? `Into ${pull.base}`))
  return span(
    { class: ['inline-flex rounded-md', confirm.ring] },
    parts.kit.splitButton(
      {
        onClick: press,
        menu: close => methodItems(shown, method, close),
        disabled: Boolean(blocked),
        busy: model.busy,
        title,
        menuTitle: 'Merge method',
        menuDisabled: pull.methods.length < 2,
      },
      dynamicChild(confirm.armed, armed => parts.kit.icon(armed ? 'check' : 'merge', 14)),
      label,
    ),
  )
}
