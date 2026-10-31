import { dynamicChild, span } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'

export const updateItems = (shown: Shown, close: () => void) => {
  const { kit } = shown.parts
  const base = shown.pull().base
  const run = (rebase: boolean) => () => {
    close()
    void shown.actions.update(rebase)
  }
  return [
    kit.menuItem({ icon: 'merge', onClick: run(false) }, span({ class: 'min-w-0 flex-1 truncate' }, `Update branch: merge ${base} in`), kit.menuReason('Adds a merge commit')),
    kit.menuItem({ icon: 'branch', onClick: run(true) }, span({ class: 'min-w-0 flex-1 truncate' }, `Update branch: rebase onto ${base}`), kit.menuReason('Replays the commits, then force-pushes')),
  ]
}

export const updateAction = (shown: Shown) => {
  const { kit } = shown.parts
  const { base, behindBy } = shown.pull()
  const busy = shown.model.busy
  return kit.quietButton(
    {
      size: 'sm',
      title: `${behindBy ? `${behindBy} commits behind ${base}` : `Behind ${base}`}. Merges ${base} in; rebasing is in the ⋯ menu.`,
      disabled: busy,
      onClick: () => void shown.actions.update(false),
    },
    dynamicChild(busy, on => (on ? kit.spinner(14) : kit.icon('pull', 14))),
    () => (busy.get() ? 'Updating…' : 'Update branch'),
  )
}
