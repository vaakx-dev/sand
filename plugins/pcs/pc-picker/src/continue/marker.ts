import type { ThreadLink, ThreadLinkEntries } from '@sand/sessions-sqlite/contract'
import type { RenderEntry } from '@sand/transcript-parts/contract'
import { span } from '@vaakx-dev/vrui'
import type { PickerContext } from '../target'

const labels: Record<keyof ThreadLinkEntries, { text: string; open: string }> = {
  'continued-to': { text: 'Continued on', open: 'Open thread' },
  'continued-from': { text: 'Continued from', open: 'Open original' },
}

const openButton = (ctx: PickerContext, link: ThreadLink, pc: string, label: string) => {
  const { linkButton } = ctx.kit
  const available = Boolean(ctx.threads.get(link.session))
  return span(
    { class: 'inline-flex shrink-0', title: available ? '' : `${pc} is offline or not paired` },
    linkButton(
      {
        disabled: !available,
        onClick: () => {
          if (ctx.threads.get(link.session)) void ctx.threads.select(link.session)
        },
      },
      label,
    ),
  )
}

export const continuedMarker =
  (ctx: PickerContext, type: keyof ThreadLinkEntries): RenderEntry =>
  entry => {
    const { markerLine } = ctx.kit
    const link = entry.data as ThreadLink
    const pc = ctx.machines.get(link.device)?.name ?? link.name
    const { text, open } = labels[type]
    return markerLine({}, span({ class: 'min-w-0 truncate', title: `${text} ${pc}` }, `${text} ${pc}`), openButton(ctx, link, pc, open))
  }
