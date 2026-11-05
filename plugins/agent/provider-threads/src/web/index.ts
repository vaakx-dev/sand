import { transcript } from '@sand/chat/contract'
import { kit } from '@sand/ui-kit/contract'
import { models } from '@sand/web-client/contract'
import { span } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import type { HandoffEntry } from '../entry'

export default definePlugin({
  name: 'handoff-row',
  description: 'Shows in the chat where another model was brought up to date, and how much of the chat it was given',
  inject: { kit },
  apply(ctx) {
    const text = ({ model, selected, omitted }: HandoffEntry) => {
      const name = ctx.get(models)?.info(model)?.label ?? model
      return `Handed over to ${name} · ${selected} of ${selected + omitted} items`
    }
    ctx.watch(
      transcript,
      found =>
        found &&
        found.entry('handoff', entry => {
          const handoff = entry.data as HandoffEntry
          return ctx.kit.markerLine({ icon: 'via' }, span({ title: `${handoff.tokens} bytes of context` }, text(handoff)))
        }),
    )
  },
})
