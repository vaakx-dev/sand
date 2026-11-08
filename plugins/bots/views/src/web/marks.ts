import type { BotSummary } from '@sand/bots/contract'
import type { Kit, WorkState } from '@sand/ui-kit/contract'
import type { Status } from '@sand/ui-shell/contract'
import { derive, dynamicChild, untrack } from '@vaakx-dev/vrui'
import { urgent } from './work'

type Face = Pick<BotSummary, 'initial' | 'color'>

const workStates: Record<Status, WorkState> = { waiting: 'waiting', ready: 'ready', merging: 'running', running: 'running', merged: 'settled', done: 'settled' }

export const statusIcon = (kit: Kit, status: Status) => kit.stateIcon(workStates[status], 'sm', urgent(status))

export const botMark = (kit: Kit, bot: () => Face | undefined, size: 16 | 20 = 16) =>
  dynamicChild(
    derive(() => {
      const found = bot()
      return found ? `${found.color}:${found.initial}` : ''
    }),
    () => {
      const found = untrack(bot)
      return found ? kit.monogram(found.initial, found.color, size) : null
    },
  )
