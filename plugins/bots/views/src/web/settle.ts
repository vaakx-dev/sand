import { settleChoices } from '@sand/bots/contract'
import { plural } from '@sand/util'
import type { Parts } from './parts'

export const settlePage = ({ ctx: { kit }, store, toasts }: Parts) =>
  kit.settingsRow(
    { title: 'Settle bots after', detail: 'Bots you haven’t talked to for this long move to the back of the list. Talking to one brings it back.' },
    kit.segmented(
      settleChoices.map(days => ({ value: days, label: plural(days, 'day') })),
      () => store.settleDays.get(),
      days => void toasts.attempt('Couldn’t change when bots settle', () => store.settle(days)),
      { label: 'Settle bots after' },
    ),
  )
