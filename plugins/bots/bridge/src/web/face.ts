import { dynamicChild } from '@vaakx-dev/vrui'
import type { BridgeWeb } from './context'
import type { Roster } from './roster'

export const botFace = (ctx: BridgeWeb, roster: Roster, bot: string, size: 16 | 26 | 32 = 16) =>
  dynamicChild(
    () => roster.find(bot),
    found => (found ? ctx.kit.botFace(found.id, found.color, size) : ctx.kit.icon('bot', size)),
  )
