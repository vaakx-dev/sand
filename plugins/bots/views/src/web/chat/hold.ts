import type { BotHold, BotSummary } from '@sand/bots/contract'
import type { ChatDock } from '@sand/composer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dollars } from '@sand/util'
import { derive, div, effect, span, untrack } from '@vaakx-dev/vrui'

export interface HoldParts {
  bot: () => BotSummary | undefined
  resume(): void
  profile(): void
}

interface Hold {
  text(bot: BotSummary): string
  action: string
  run(parts: HoldParts): void
}

const holds: Record<BotHold, Hold> = {
  paused: { text: () => 'Paused. Messages wait until you resume it.', action: 'Resume', run: parts => parts.resume() },
  limit: {
    text: bot => `Reached its ${dollars(bot.budget ?? bot.spent)} monthly limit. Messages wait until next month or a higher limit.`,
    action: 'Profile',
    run: parts => parts.profile(),
  },
}

const holdBanner = ({ secondaryAction }: Kit, parts: HoldParts, { text, action, run }: Hold) =>
  div(
    { role: 'status', class: 'flex flex-wrap items-center gap-x-3 gap-y-1 pb-2 text-sm text-neutral-400' },
    span({ class: 'min-w-48 flex-1' }, () => {
      const bot = parts.bot()
      return bot ? text(bot) : ''
    }),
    secondaryAction({ size: 'sm', onClick: () => run(parts) }, action),
  )

export const holdSlot = (kit: Kit, parts: HoldParts, dock: ChatDock) => {
  const hold = derive(() => parts.bot()?.hold)
  return effect(() => {
    const shown = hold.get()
    return shown ? untrack(() => dock.slot('banner', () => holdBanner(kit, parts, holds[shown]))) : undefined
  })
}
