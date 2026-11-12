import { botName, botRoute, type BotSummary } from '@sand/bots/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { MenuAction, ShellGroup, ShellRow } from '@sand/ui-shell/contract'
import { deleteAction } from './delete'
import type { Parts } from './parts'
import { botStatus, statusLine } from './work'

const menuOf = (parts: Parts, bot: BotSummary): MenuAction[] => [
  { id: 'profile', label: 'Profile', icon: 'sliders', run: () => parts.profile(bot.id) },
  {
    id: 'pause',
    label: bot.paused ? 'Resume' : 'Pause',
    run: () => parts.store.update(bot.id, { paused: !bot.paused }).catch(error => parts.ctx.report(error)),
  },
  deleteAction(parts, bot.id, botName(bot)),
]

const faceStateOf = (bot: BotSummary): FaceState | undefined => (botStatus(bot) === 'running' ? 'running' : undefined)

const rowOf = (parts: Parts, bot: BotSummary): ShellRow => {
  const at = bot.last?.at
  const detail = statusLine(bot)
  return {
    id: bot.id,
    label: botName(bot),
    to: { kind: botRoute, id: bot.id },
    menu: () => menuOf(parts, bot),
    lead: () => {
      const state = faceStateOf(bot)
      return parts.ctx.kit.botFace(bot.id, bot.color, 32, state ? { state } : {})
    },
    ...(botStatus(bot) === 'waiting' && { status: 'waiting' as const }),
    ...(detail && { detail: () => detail }),
    ...(at !== undefined && { at }),
  }
}

export const botsGroup = (parts: Parts): ShellGroup => {
  const bots = parts.store.bots.get()
  return {
    id: 'bots',
    label: 'Bots',
    action: { label: 'New bot', icon: 'plus', run: parts.create },
    rows: (bots ?? []).map(bot => rowOf(parts, bot)),
    ...(bots?.length === 0 && { empty: 'No bots yet.' }),
  }
}
