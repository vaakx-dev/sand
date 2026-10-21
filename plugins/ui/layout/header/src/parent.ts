import type { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { show, span, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export interface ParentLink {
  id: string
  title: string
}

export const parentOf = (ctx: Context): ParentLink | undefined => {
  const info = ctx.get(threads)?.current()?.info
  if (info?.kind !== 'agent' || !info.parent) return undefined
  return { id: info.parent, title: ctx.get(threads)?.get(info.parent)?.info.title || 'Untitled thread' }
}

export const parentCrumb = (ctx: Context<{ kit: typeof kit }>, parent: Sig<ParentLink | undefined>) => {
  const { icon, quietButton } = ctx.kit
  return show(parent.map(Boolean), () =>
    quietButton(
      {
        size: 'sm',
        class: 'max-w-48 shrink',
        title: () => `Back to ${parent.get()?.title ?? 'the parent thread'}`,
        'aria-label': () => `Sub-agent of ${parent.get()?.title ?? 'the parent thread'}`,
        onClick: () => {
          const link = parent.get()
          if (link) void ctx.get(threads)?.select(link.id)
        },
      },
      icon('up', 14),
      span({ class: 'hidden min-w-0 truncate md:inline' }, () => `Sub-agent of ${parent.get()?.title ?? ''}`),
    ),
  )
}
