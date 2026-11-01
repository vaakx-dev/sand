import type { MergeMethod } from '@sand/github/contract'
import { div, dynamicChild, sig } from '@vaakx-dev/vrui'
import { confirmStep } from '../../confirm/step'
import { chosenMethod, rememberMethod } from '../../pull/method'
import type { Shown } from '../shown'
import { methodPicker } from './method'

export const mergeAction = (shown: Shown, auto: boolean) => {
  const { parts, model, actions } = shown
  const { kit } = parts
  const pull = shown.pull()
  const method = sig<MergeMethod>(chosenMethod(pull.repo, pull.methods))
  const confirm = confirmStep()
  const choose = (value: MergeMethod) => {
    method.set(value)
    rememberMethod(pull.repo, value)
    confirm.reset()
  }
  const press = () => {
    if (auto) return void actions.merge(method.get(), true)
    confirm.press(() => void actions.merge(method.get()))
  }
  const label = () => {
    if (model.busy.get()) return 'Merging…'
    if (confirm.armed.get()) return 'Confirm merge?'
    return auto ? 'Merge when ready' : 'Merge'
  }
  const title = () => (auto ? `GitHub merges it once the checks pass` : `Into ${pull.base}`)
  return div(
    { class: 'flex flex-wrap items-center gap-2' },
    methodPicker(shown, method, choose),
    kit.primaryAction(
      { size: 'sm', class: confirm.ring, title, disabled: model.busy, onClick: press },
      dynamicChild(model.busy, busy => (busy ? kit.spinner(14) : kit.icon('merge', 14))),
      label,
    ),
  )
}
