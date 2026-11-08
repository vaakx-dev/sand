import { botName, botRoute, type BotSummary } from '@sand/bots/contract'
import type { MenuAction, ShellGroup, ShellRow } from '@sand/ui-shell/contract'
import { oneLine } from '@sand/util'
import { projectNames, type Parts } from './parts'

const menuOf = (parts: Parts, bot: BotSummary): MenuAction[] => [
  { id: 'profile', label: 'Profile', icon: 'sliders', run: () => parts.profile(bot.id) },
  {
    id: 'pause',
    label: bot.paused ? 'Resume' : 'Pause',
    run: () => parts.store.update(bot.id, { paused: !bot.paused }).catch(error => parts.ctx.report(error)),
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: 'trash',
    danger: true,
    confirm: `Delete ${botName(bot)}, its chat, plan and memory?`,
    run: () => {
      parts.tabs.forget(bot.id)
      return parts.store.remove(bot.id).catch(error => parts.ctx.report(error))
    },
  },
]

const rowOf = (parts: Parts, bot: BotSummary): ShellRow => {
  const lead = parts.work.lead(bot.id)
  const status = parts.work.status(bot)
  const detail = lead?.title ?? (bot.last ? oneLine(bot.last.text) : '')
  const at = lead?.at ?? bot.last?.at
  return {
    id: bot.id,
    label: botName(bot),
    to: { kind: botRoute, id: bot.id },
    menu: () => menuOf(parts, bot),
    ...(parts.ctx.shell.state() !== 'phone' && { mark: { initial: bot.initial, color: bot.color } }),
    ...(detail && { detail }),
    ...(bot.projects.length && { meta: projectNames(parts, bot.projects) }),
    ...(status && { status }),
    ...(at !== undefined && { at }),
  }
}

export const botsGroup = (parts: Parts): ShellGroup => ({
  id: 'bots',
  label: 'Bots',
  action: { label: 'New bot', icon: 'plus', run: parts.create },
  rows: (parts.store.bots.get() ?? []).map(bot => rowOf(parts, bot)),
})
