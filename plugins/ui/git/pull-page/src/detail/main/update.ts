import { span } from '@vaakx-dev/vrui'
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

export const updateSplit = (shown: Shown) => {
  const { kit } = shown.parts
  const behind = shown.pull().behindBy
  return kit.splitButton(
    {
      onClick: () => void shown.actions.update(false),
      menu: close => updateItems(shown, close),
      busy: shown.model.busy,
      title: behind ? `${behind} commits behind ${shown.pull().base}` : `Behind ${shown.pull().base}`,
      menuTitle: 'How to update',
    },
    kit.icon('pull', 14),
    'Update branch',
  )
}
