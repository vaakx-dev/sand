import type { MergeMethod } from '@sand/github/contract'
import type { Choice } from '@sand/ui-kit/contract'
import { div, dynamicChild, sig } from '@vaakx-dev/vrui'
import { confirmStep } from '../../confirm/step'
import { chosenMethod, methodNotes, rememberMethod } from '../../pull/method'
import type { Shown } from '../shown'

const shortLabels: Record<MergeMethod, string> = { squash: 'Squash', merge: 'Merge commit', rebase: 'Rebase' }

export const mergeAction = (shown: Shown, auto: boolean) => {
  const { parts, model, actions } = shown
  const { kit } = parts
  const pull = shown.pull()
  const method = sig<MergeMethod>(chosenMethod(pull.repo, pull.methods))
  const confirm = confirmStep()
  const choices: Choice<MergeMethod>[] = pull.methods.map(value => ({ value, label: shortLabels[value], title: methodNotes[value] }))
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
    choices.length > 1 ? kit.segmented(choices, method, choose, { label: 'Merge method' }) : null,
    kit.primaryAction(
      { size: 'sm', class: confirm.ring, title, disabled: model.busy, onClick: press },
      dynamicChild(model.busy, busy => (busy ? kit.spinner(14) : kit.icon('merge', 14))),
      label,
    ),
  )
}
