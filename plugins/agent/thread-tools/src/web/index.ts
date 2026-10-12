import type { SenderEntries } from '@sand/sessions-sqlite/contract'
import type { RenderEntry } from '@sand/transcript-parts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Threads } from '@sand/web-client/contract'
import { span } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

const sentBy =
  ({ linkButton, markerLine }: Kit, threads: Threads): RenderEntry =>
  entry => {
    const link = entry.data as SenderEntries['sent-by']
    const sender = threads.get(link.session)
    const text = sender ? `Sent by the agent in "${sender.info.title ?? 'Untitled thread'}"` : `Sent by an agent on ${link.name}`
    return markerLine(
      { icon: 'bot' },
      span({ class: 'min-w-0 truncate', title: text }, text),
      sender && linkButton({ onClick: () => void threads.select(link.session) }, 'Open thread'),
    )
  }

export default definePlugin({
  name: 'thread-tools-view',
  description: 'Marks messages that an agent sent into a thread, with a link to the agent thread',
  inject: ['threads', 'kit'],
  uses: { transcript: 'messages sent by an agent look like your own' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript?.entry('sent-by', sentBy(ctx.kit, ctx.threads)))
  },
})
