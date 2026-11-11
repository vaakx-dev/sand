import { botName, botRoute, type BotSummary } from '@sand/bots/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { MenuAction, ShellGroup, ShellRow } from '@sand/ui-shell/contract'
import { span } from '@vaakx-dev/vrui'
import type { Parts } from './parts'

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
    run: () => parts.store.remove(bot.id).catch(error => parts.ctx.report(error)),
  },
]

const faceStateOf = (parts: Parts, bot: BotSummary): FaceState | undefined => {
  const status = parts.work.status(bot)
  if (status === 'running' || status === 'merging') return 'running'
  if (status === 'waiting') return 'waiting'
  return undefined
}

const rowOf = (parts: Parts, bot: BotSummary): ShellRow => {
  const lead = parts.work.lead(bot.id)
  const at = lead?.at ?? bot.last?.at
  const detail = parts.work.detailOf(bot)
  return {
    id: bot.id,
    label: botName(bot),
    to: { kind: botRoute, id: bot.id },
    menu: () => menuOf(parts, bot),
    lead: () => {
      const state = faceStateOf(parts, bot)
      return parts.ctx.kit.botFace(bot.id, bot.color, 32, state ? { state } : {})
    },
    ...(detail && { detail: () => span({ class: detail.waiting ? 'text-warning-400' : 'text-neutral-500' }, detail.text) }),
    ...(at !== undefined && { at }),
  }
}

export const botsGroup = (parts: Parts): ShellGroup => ({
  id: 'bots',
  label: 'Bots',
  action: { label: 'New bot', icon: 'plus', run: parts.create },
  rows: (parts.store.bots.get() ?? []).map(bot => rowOf(parts, bot)),
})
