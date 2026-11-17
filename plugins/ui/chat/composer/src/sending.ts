import { wire, wireHello } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { toastsOf } from '@sand/toasts/contract'
import { helloSending, type Sending, sendingChange, sendingSet } from '@sand/turns-contract/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { ComposerContext } from './context'

const QUEUE_DETAIL = 'Off: a message sent while a chat is working reaches it at its next step. On: it waits until the turn ends'

const sendingPage = (kit: Kit, state: Sig<Sending | undefined>, choose: (queue: boolean) => void) =>
  kit.settingsSection(
    {},
    kit.settingsRow(
      { title: 'Queue messages for the next turn', detail: QUEUE_DETAIL },
      kit.toggleSwitch({
        on: () => state.get()?.queue === true,
        disabled: () => state.get() === undefined,
        'aria-label': 'Queue messages for the next turn',
        onClick: () => choose(!state.get()?.queue),
      }),
    ),
  )

export const sendingSettings = (ctx: ComposerContext) => {
  const state = sig<Sending | undefined>(undefined)
  const greeted = () => state.set(ctx.get(wire)?.hello(helloSending))
  const choose = (queue: boolean) =>
    void toastsOf(ctx).attempt('Couldn’t change how messages are sent', async () => {
      const found = ctx.get(wire)
      if (found) state.set(await found.call(sendingSet, { queue }))
    })
  greeted()
  ctx.on(wireHello, greeted)
  ctx.watch(wire, found => found?.on(sendingChange, next => state.set(next)))
  ctx.watch(settings, found =>
    found?.page({ id: 'sending', label: 'Sending', intro: 'What happens to a message you send while a chat is working.', icon: 'steer', group: 'agents', order: 21, render: () => sendingPage(ctx.kit, state, choose) }),
  )
}
