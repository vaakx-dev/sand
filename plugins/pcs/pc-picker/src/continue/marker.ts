import type { ThreadLink, ThreadLinkEntries } from '@sand/sessions-sqlite/contract'
import type { RenderEntry } from '@sand/transcript-parts/contract'
import { button, span, textRule } from '@sand/dom'
import type { ContinueContext } from './flow'

const labels: Record<keyof ThreadLinkEntries, { text: string; open: string }> = {
  'continued-to': { text: 'Continued on', open: 'Open thread' },
  'continued-from': { text: 'Continued from', open: 'Open original' },
}

const openButton = (ctx: ContinueContext, link: ThreadLink, pc: string, label: string) => {
  const available = Boolean(ctx.threads.get(link.session))
  return button(
    {
      type: 'button',
      class: 'shrink-0 cursor-pointer text-accent-400 outline-none hover:underline focus-visible:underline disabled:cursor-default disabled:text-neutral-600 disabled:no-underline',
      disabled: !available,
      title: available ? '' : `${pc} is offline or not paired`,
      onClick: () => {
        if (ctx.threads.get(link.session)) void ctx.threads.select(link.session)
      },
    },
    label,
  )
}

export const continuedMarker =
  (ctx: ContinueContext, type: keyof ThreadLinkEntries): RenderEntry =>
  entry => {
    const link = entry.data as ThreadLink
    const pc = ctx.machines.get(link.device)?.name ?? link.name
    const { text, open } = labels[type]
    return textRule(span({ class: 'min-w-0 truncate', title: `${text} ${pc}` }, `${text} ${pc}`), openButton(ctx, link, pc, open))
  }
