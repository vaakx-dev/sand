import type { BotHold, BotSummary } from '@sand/bots/contract'
import type { ChatDock } from '@sand/composer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dollars } from '@sand/util'
import { derive, div, effect, span, untrack } from '@vaakx-dev/vrui'

export interface HoldParts {
  bot: () => BotSummary
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
    action: 'Change limit',
    run: parts => parts.profile(),
  },
}

const holdBanner = ({ icon, secondaryAction }: Kit, parts: HoldParts, { text, action, run }: Hold) =>
  div(
    { role: 'status', class: 'flex flex-wrap items-center gap-x-2 gap-y-1 pb-1' },
    div(
      { class: 'flex min-w-48 flex-1 items-start gap-2 text-warning-400' },
      span({ class: 'inline-flex h-6 shrink-0 items-center' }, icon('info', 'md')),
      span({ class: 'min-w-0 flex-1 leading-6' }, () => text(parts.bot())),
    ),
    secondaryAction({ size: 'sm', onClick: () => run(parts) }, action),
  )

export const holdSlot = (kit: Kit, parts: HoldParts, dock: ChatDock) => {
  const hold = derive(() => parts.bot().hold)
  return effect(() => {
    const shown = hold.get()
    return shown ? untrack(() => dock.slot('banner', () => holdBanner(kit, parts, holds[shown]))) : undefined
  })
}
