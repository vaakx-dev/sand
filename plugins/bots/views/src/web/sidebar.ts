import { botName, botRoute, type BotSummary } from '@sand/bots/contract'
import type { MenuAction, ShellGroup, ShellRow } from '@sand/ui-shell/contract'
import { deleteAction } from './delete'
import type { Parts } from './parts'
import { botStatus, faceStateOf, settled, statusLine } from './work'

const menuOf = (parts: Parts, bot: BotSummary): MenuAction[] => [
  { id: 'profile', label: 'Profile', icon: 'sliders', run: () => parts.profile(bot.id) },
  {
    id: 'pause',
    label: bot.paused ? 'Resume' : 'Pause',
    run: () => parts.toasts.attempt(`Couldn’t ${bot.paused ? 'resume' : 'pause'} ${botName(bot)}`, () => parts.store.update(bot.id, { paused: !bot.paused })),
  },
  deleteAction(parts, bot.id, botName(bot)),
]

const rowOf = (parts: Parts, bot: BotSummary): ShellRow => {
  const at = bot.last?.at
  const detail = statusLine(bot)
  const status = botStatus(bot)
  return {
    id: bot.id,
    label: botName(bot),
    to: { kind: botRoute, id: bot.id },
    menu: () => menuOf(parts, bot),
    lead: () => {
      const state = faceStateOf(bot)
      return parts.ctx.kit.botFace(bot.id, bot.color, 32, state ? { state } : {})
    },
    ...(status ? { status } : { quiet: true }),
    ...(detail && { detail: () => detail }),
    ...(at !== undefined && { at }),
  }
}

const activeAt = (bot: BotSummary) => Math.max(bot.last?.at ?? 0, bot.talked, bot.updated)

const newest = (bots: BotSummary[]) => bots.toSorted((a, b) => activeAt(b) - activeAt(a))

export const botsGroups = (parts: Parts, now: number): ShellGroup[] => {
  const bots = parts.store.bots.get()
  const days = parts.store.settleDays.get()
  const isSettled = (bot: BotSummary) => days !== undefined && settled(bot, days, now)
  const back = newest((bots ?? []).filter(isSettled))
  const front = newest((bots ?? []).filter(bot => !isSettled(bot)))
  return [
    {
      id: 'bots',
      label: 'Bots',
      action: { label: 'New bot', icon: 'plus', run: parts.create },
      rows: front.map(bot => rowOf(parts, bot)),
      ...(bots?.length === 0 && { empty: 'No bots yet.' }),
    },
    ...(back.length ? [{ id: 'settled', label: 'Settled', settled: true, rows: back.map(bot => rowOf(parts, bot)) }] : []),
  ]
}
