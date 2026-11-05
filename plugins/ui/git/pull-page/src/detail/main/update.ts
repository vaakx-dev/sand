import { pullPrompts } from '@sand/pull-links/contract'
import { dynamicChild } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'

const updateBranch = (shown: Shown) =>
  shown.actions.update({ label: 'Ask the agent to fix it', primary: true, run: () => void shown.parts.agent.ask(shown.pull(), pullPrompts.resolve(shown.pull())) })

export const updateItem = (shown: Shown, close: () => void) =>
  shown.parts.kit.menuItem(
    {
      icon: 'pull',
      onClick: () => {
        close()
        void updateBranch(shown)
      },
    },
    'Update branch',
  )

export const updateAction = (shown: Shown) => {
  const { kit } = shown.parts
  const { base, behindBy } = shown.pull()
  const busy = shown.model.busy
  return kit.quietButton(
    {
      size: 'sm',
      title: `${behindBy ? `${behindBy} commits behind ${base}` : `Behind ${base}`}. Merges ${base} in.`,
      disabled: busy,
      onClick: () => void updateBranch(shown),
    },
    dynamicChild(busy, on => (on ? kit.spinner(14) : kit.icon('pull', 14))),
    () => (busy.get() ? 'Updating…' : 'Update branch'),
  )
}
