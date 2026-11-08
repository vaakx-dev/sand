import { dynamicChild } from '@vaakx-dev/vrui'
import type { BridgeWeb } from './context'
import type { Roster } from './roster'

export const botFace = (ctx: BridgeWeb, roster: Roster, bot: string, size: 16 | 20) =>
  dynamicChild(
    () => roster.find(bot),
    found => (found ? ctx.kit.monogram(found.initial, found.color, size) : ctx.kit.icon('bot', size)),
  )
