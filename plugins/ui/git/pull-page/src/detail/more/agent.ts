import { type Child, span } from '@vaakx-dev/vrui'
import { isLive } from '../../pull/look'
import type { Shown } from '../shown'

const label = (text: string) => span({ class: 'min-w-0 flex-1 truncate' }, text)

export const agentItems = (shown: Shown, close: () => void): Child[] => {
  const { kit, agent } = shown.parts
  const pull = shown.pull()
  const linked = shown.linked.get()[0]
  const then = (run: () => void) => () => {
    close()
    run()
  }
  const open = agent.canOpen(pull)
    ? kit.menuItem({ icon: 'worktree', onClick: then(() => void agent.open(pull)) }, label('Open in a thread'), kit.menuReason(`Its own worktree on ${pull.head}`))
    : kit.menuItem({ icon: 'worktree', disabled: true }, label('Open in a thread'), kit.menuReason(`Add a project with ${pull.repo} as its remote first`))
  const watch =
    linked && isLive(pull.state)
      ? kit.menuItem(
          { icon: 'eye', onClick: then(() => void agent.watch(pull, linked, !linked.watching)) },
          label(linked.watching ? 'Stop the agent watching' : 'Let the agent watch'),
          kit.menuReason(linked.watching ? 'It wakes on checks, reviews and conflicts' : 'Wake it on checks, reviews and conflicts'),
        )
      : null
  return [isLive(pull.state) ? open : null, watch].filter(item => item !== null)
}
