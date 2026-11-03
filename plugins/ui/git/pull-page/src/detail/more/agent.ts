import { isLivePull } from '@sand/github/look'
import type { Child } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'

export const agentItems = (shown: Shown, close: () => void): Child[] => {
  const { kit, agent } = shown.parts
  const pull = shown.pull()
  if (!isLivePull(pull.state)) return []
  const linked = shown.linked.get()[0]
  const then = (run: () => void) => () => {
    close()
    run()
  }
  const open = agent.canOpen(pull) ? kit.menuItem({ icon: 'worktree', onClick: then(() => void agent.open(pull)) }, 'Open in a thread') : null
  const watch = linked
    ? kit.menuItem(
        { icon: 'eye', onClick: then(() => void agent.watch(pull, linked, !linked.watching)) },
        linked.watching ? 'Stop the agent watching' : kit.menuLabel('Let the agent watch', 'Wakes on checks, reviews and conflicts'),
      )
    : null
  return [open, watch].filter(item => item !== null)
}
