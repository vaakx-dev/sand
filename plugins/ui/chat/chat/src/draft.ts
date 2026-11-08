import type { Pulse } from '@sand/reactive'
import { div, span } from '@vaakx-dev/vrui'
import type { ChatContext } from './context'
import { leadMark, leadOf } from './head/lead'

export const draftLine = (ctx: ChatContext, changes: Pulse) => {
  const lead = changes.read(() => leadOf(ctx, undefined))
  return div(
    { class: 'flex min-w-0 items-center justify-center gap-2 px-5 pb-2 text-neutral-400' },
    leadMark(ctx.kit, lead, 20),
    span({ class: 'truncate' }, () => lead.get()?.label ?? ''),
  )
}
