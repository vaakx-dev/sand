import type { MergeMethod, PullSummary } from '@sand/github/contract'
import type { Choice } from '@sand/ui-kit/contract'
import { batch, div, effect, onTimeout } from '@vaakx-dev/vrui'
import { canAutoMerge, mergeBlock } from '../pull/facts'
import type { Shown } from './shown'

const methods: Choice<MergeMethod>[] = [
  { value: 'squash', label: 'Squash', title: 'Squash all commits into one' },
  { value: 'merge', label: 'Merge commit', title: 'Keep the commits and add a merge commit' },
  { value: 'rebase', label: 'Rebase', title: 'Replay the commits onto the base' },
]

const confirmFor = 4000

export const mergeControl = (shown: Shown, summary: PullSummary) => {
  const { parts, link, at, state } = shown
  const { kit } = parts
  const auto = canAutoMerge(summary)
  const blocked = Boolean(mergeBlock(summary)) && !auto

  effect(() => {
    if (state.confirming.get()) onTimeout(() => state.confirming.set(false), confirmFor)
  })

  const choose = (method: MergeMethod) =>
    batch(() => {
      state.method.set(method)
      state.confirming.set(false)
    })

  const press = () => {
    if (!state.confirming.get()) return state.confirming.set(true)
    state.confirming.set(false)
    void state.run(() => parts.actions.merge(link, at, state.method.get(), auto))
  }

  const label = () => (state.confirming.get() ? 'Confirm merge?' : auto ? 'Merge when ready' : 'Merge')

  return div(
    { class: 'flex flex-wrap items-center gap-2' },
    kit.segmented(methods, state.method, choose, { label: 'Merge method', inset: true }),
    kit.primaryAction({ size: 'sm', disabled: () => blocked || state.busy.get(), onClick: press }, label),
  )
}
