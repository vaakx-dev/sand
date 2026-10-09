import { icon, quietButton, show, span, type Sig } from '@sand/dom'
import type { Context } from 'drydock'

export interface ParentLink {
  id: string
  title: string
}

export const parentOf = (ctx: Context): ParentLink | undefined => {
  const info = ctx.threads?.current()?.info
  if (info?.kind !== 'agent' || !info.parent) return undefined
  return { id: info.parent, title: ctx.threads?.get(info.parent)?.info.title ?? 'Untitled thread' }
}

export const parentCrumb = (ctx: Context, parent: Sig<ParentLink | undefined>) =>
  show(parent.map(Boolean), () =>
    quietButton(
      {
        size: 'sm',
        class: 'max-w-48 shrink',
        title: () => `Back to ${parent.get()?.title ?? 'the parent thread'}`,
        'aria-label': () => `Sub-agent of ${parent.get()?.title ?? 'the parent thread'}`,
        onClick: () => {
          const link = parent.get()
          if (link) void ctx.threads?.select(link.id)
        },
      },
      icon('up', 13),
      span({ class: 'hidden min-w-0 truncate md:inline' }, () => `Sub-agent of ${parent.get()?.title ?? ''}`),
    ),
  )
