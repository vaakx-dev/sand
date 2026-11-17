import { botName, botRoute, type BotSummary } from '@sand/bots/contract'
import { isBack, listGroups, snoozeAction, snoozedUntil, type ListEntry } from '@sand/threads-home/contract'
import type { MenuAction, ShellGroup, ShellRow } from '@sand/ui-shell/contract'
import { deleteAction } from './delete'
import type { Parts } from './parts'
import { activeAt, botStatus, faceStateOf, statusLine, subagentsSince } from './work'

const menuOf = (parts: Parts, bot: BotSummary): MenuAction[] => {
  const chat = parts.chat(bot.id)
  return [
    { id: 'profile', label: 'Profile', icon: 'sliders', run: () => parts.profile(bot.id) },
    {
      id: 'pause',
      label: bot.paused ? 'Resume' : 'Pause',
      run: () => parts.toasts.attempt(`Couldn’t ${bot.paused ? 'resume' : 'pause'} ${botName(bot)}`, () => parts.store.update(bot.id, { paused: !bot.paused })),
    },
    ...(chat ? [snoozeAction(parts.ctx.threads, chat)] : []),
    deleteAction(parts, bot.id, botName(bot)),
  ]
}

const rowOf = (parts: Parts, bot: BotSummary): ShellRow => {
  const at = bot.status === 'working' ? bot.last?.at : (subagentsSince(bot) ?? bot.last?.at)
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
    ...(status && { status }),
    ...(detail && { detail: () => detail }),
    ...(at !== undefined && { at }),
  }
}

const entryOf = (parts: Parts, bot: BotSummary): ListEntry => {
  const chat = parts.chat(bot.id)
  const snoozed = chat && !botStatus(bot) ? snoozedUntil(chat) : undefined
  const woke = chat && isBack(chat) ? (chat.info.snoozed ?? 0) : 0
  return { row: rowOf(parts, bot), moved: Math.max(activeAt(bot), woke), talked: Math.max(bot.talked, woke), ...(snoozed && { snoozed }) }
}

export const botsGroups = (parts: Parts, now: number): ShellGroup[] => {
  const bots = parts.store.bots.get()
  return listGroups({
    id: 'bots',
    label: 'Bots',
    entries: (bots ?? []).map(bot => entryOf(parts, bot)),
    settleDays: parts.threadRows.get()?.settleDays(),
    now,
    action: { label: 'New bot', icon: 'plus', run: parts.create },
    ...(bots && { empty: 'No bots yet.' }),
  })
}
