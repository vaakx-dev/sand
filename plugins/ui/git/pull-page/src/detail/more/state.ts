import { type Child, span } from '@vaakx-dev/vrui'
import { confirmSheet } from '../../confirm/sheet'
import { pullName } from '../../pull/look'
import type { Shown } from '../shown'

const label = (text: string) => span({ class: 'min-w-0 flex-1 truncate' }, text)

const closePull = async (shown: Shown) => {
  const name = pullName(shown.pull().number)
  const sure = await confirmSheet(shown.parts.ctx, {
    title: `Close ${name}?`,
    text: 'It closes without merging. You can reopen it later.',
    action: 'Close pull request',
  })
  if (sure) await shown.actions.close(true)
}

const revertPull = async (shown: Shown) => {
  const pull = shown.pull()
  const sure = await confirmSheet(shown.parts.ctx, {
    title: `Revert ${pullName(pull.number)}?`,
    text: `GitHub opens a new pull request that undoes these changes on ${pull.base}.`,
    action: 'Open revert pull request',
  })
  if (sure) await shown.actions.revert()
}

export const stateItems = (shown: Shown, close: () => void): Child[] => {
  const { kit } = shown.parts
  const pull = shown.pull()
  if (!pull.canEdit) return []
  const then = (run: () => Promise<void>) => () => {
    close()
    void run()
  }
  if (pull.state === 'merged') return [kit.menuItem({ icon: 'retry', onClick: then(() => revertPull(shown)) }, label('Revert'), kit.menuReason('Asks to confirm'))]
  if (pull.state === 'closed') return [kit.menuItem({ icon: 'pull-request', onClick: then(() => shown.actions.close(false)) }, 'Reopen')]
  return [kit.menuItem({ icon: 'x', tone: 'danger', onClick: then(() => closePull(shown)) }, label('Close pull request'), kit.menuReason('Asks to confirm'))]
}
