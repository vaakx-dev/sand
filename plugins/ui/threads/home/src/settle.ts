import { wire, wireHello } from '@sand/devices-contract'
import { helloSettleDays, settleChoices, settleDaysChange, settleDaysSet, settleDefault } from '@sand/orchestrator/contract'
import { settingMark } from '@sand/settings/contract'
import { toastsOf } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

type SettleContext = Context<{ wire: typeof wire; kit: typeof kit }>

export const settleItem = { id: 'settle', label: 'Settle after', keywords: ['settled', 'idle', 'inactive', 'days', 'old threads'] }

const choiceLabel = (value: number) => (value === settleDefault ? `${plural(value, 'day')} (default)` : plural(value, 'day'))

export const settleDays = (ctx: SettleContext) => {
  const days = sig<number | undefined>(undefined)
  const greeted = () => days.set(ctx.wire.hello(helloSettleDays))
  ctx.on(wireHello, greeted)
  if (ctx.wire.ready()) greeted()
  ctx.effect(() => ctx.wire.on(settleDaysChange, next => days.set(next)))
  return days
}

export const settleRow = (ctx: SettleContext, days: Sig<number | undefined>) => {
  const toasts = toastsOf(ctx)
  const choose = (next: number) => void toasts.attempt('Couldn’t change when chats settle', () => ctx.wire.call(settleDaysSet, { days: next }).then(found => days.set(found)))
  const reset = { changed: () => days.get() !== undefined && days.get() !== settleDefault, run: () => choose(settleDefault) }
  return ctx.kit.settingsRow(
    { ...settingMark(settleItem.id), title: settleItem.label, reset },
    ctx.kit.segmented(
      settleChoices.map(value => ({ value, label: choiceLabel(value) })),
      () => days.get(),
      choose,
      { label: settleItem.label },
    ),
  )
}
