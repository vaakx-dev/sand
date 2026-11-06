import { botViews } from '@sand/bots/contract'
import type { BridgeWeb } from './context'
import type { Roster } from './roster'

export const botFace = (ctx: BridgeWeb, roster: Roster, bot: string, size: number) =>
  ctx.get(botViews)?.avatar(() => roster.find(bot) ?? { id: bot, color: 'grey' }, size)
