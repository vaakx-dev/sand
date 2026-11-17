import { wire, wireHello } from '@sand/devices-contract'
import { helloSettleDays, settleChoices, settleDaysChange, settleDaysSet } from '@sand/orchestrator/contract'
import { toastsOf } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

type SettleContext = Context<{ wire: typeof wire; kit: typeof kit }>

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
  return ctx.kit.settingsRow(
    { title: 'Settle after', detail: 'Threads and bots you haven’t talked to for this long move to Settled at the back of the list. Talking to one brings it back.' },
    ctx.kit.segmented(
      settleChoices.map(value => ({ value, label: plural(value, 'day') })),
      () => days.get(),
      choose,
      { label: 'Settle after' },
    ),
  )
}
