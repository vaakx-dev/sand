import { composer } from '@sand/composer/contract'
import { pcs, threadPcs, wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { outbox } from '@sand/web-client/contract'
import { effect } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { outboxBanner } from './banner'
import { outboxModel } from './model'

export default definePlugin({
  name: 'outbox',
  description: "Shows the messages waiting for the thread's PC above the composer, with Cancel and Send now",
  inject: { kit, outbox, wire, pcs, threadPcs },
  apply(ctx) {
    const model = outboxModel(ctx, ctx)
    ctx.watch(composer, found => found && effect(() => (model.waiting.get() ? found.slot('banner', () => outboxBanner(ctx.kit, model)) : undefined)))
  },
})
