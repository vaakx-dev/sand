import { toolViews, transcript, type ToolRenderer, type ToolViews } from '@sand/chat/contract'
import { wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { requestEntry, type SecretRequest } from '../contract'
import { secretCard } from './card'

const stepView = ({ field }: ToolViews): ToolRenderer => ({
  icon: 'key',
  verb: 'Asked for',
  activeVerb: 'Asking for',
  label: tool => field(tool.call.input, 'title'),
})

export default definePlugin({
  name: 'secrets-web',
  description: "Shows the agent's secret requests in the chat as a private card with a masked field",
  inject: { wire, kit, threads, toolViews },
  apply(ctx) {
    ctx.watch(
      transcript,
      found =>
        found &&
        joinDisposers(
          found.tool('request_secret', stepView(ctx.toolViews)),
          found.entry(requestEntry, (entry, thread) => secretCard(ctx, thread, entry.data as SecretRequest)),
        ),
    )
  },
})
