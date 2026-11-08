import type { Pulse } from '@sand/reactive'
import type { PressAt } from '@sand/ui-kit/contract'
import type { Shell } from '@sand/ui-shell/contract'
import type { Thread } from '@sand/web-client/contract'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import { threadRoute } from '../contract'
import { leadMark, leadOf, type Lead } from './lead'
import { threadActions } from './menu'
import { threadTitle } from './place'

interface ParentLink {
  id: string
  title: string
}

const parentOf = (ctx: ChatContext, thread: Thread | undefined): ParentLink | undefined => {
  const info = thread?.info
  if (info?.kind !== 'agent' || !info.parent) return undefined
  return { id: info.parent, title: ctx.threads.get(info.parent)?.info.title || 'Untitled thread' }
}

const separator = () => span({ class: 'shrink-0 text-neutral-500' }, '/')

const leadCrumb = (ctx: ChatContext, lead: Sig<Lead | undefined>, parent: Sig<ParentLink | undefined>) =>
  span(
    { class: ['max-w-32 shrink-0 items-center gap-2 md:max-w-48', () => (parent.get() ? 'hidden md:flex' : 'flex')], title: () => lead.get()?.path ?? '' },
    leadMark(ctx.kit, lead, 16),
    span({ class: 'min-w-0 truncate text-neutral-400' }, () => lead.get()?.label ?? ''),
    separator(),
  )

const parentCrumb = (ctx: ChatContext, shell: Shell, parent: Sig<ParentLink | undefined>) =>
  span(
    { class: 'flex shrink-0 items-center gap-2' },
    ctx.kit.linkButton(
      {
        class: 'max-w-32 truncate md:max-w-40',
        title: () => `Back to ${parent.get()?.title ?? 'the parent thread'}`,
        onClick: () => {
          const link = parent.get()
          if (link) shell.open({ kind: threadRoute, id: link.id })
        },
      },
      () => parent.get()?.title ?? '',
    ),
    separator(),
  )

const titleText = (title: Sig<string>) => span({ class: 'min-w-0 truncate font-medium text-neutral-100' }, title)

const below = (event: MouseEvent): PressAt | undefined => {
  const from = event.currentTarget
  if (!(from instanceof HTMLElement)) return undefined
  const box = from.getBoundingClientRect()
  return { x: box.left, y: box.bottom + 4, touch: event instanceof PointerEvent && event.pointerType === 'touch', from }
}

const titleMenu = (ctx: ChatContext, shell: Shell, id: string, title: Sig<string>) => {
  const { contextMenu, icon, navButton } = ctx.kit
  const menu = contextMenu()
  const spec = () => ({ title: title.get(), actions: threadActions(ctx, shell, id) })
  const openBelow = (event: MouseEvent) => {
    const at = below(event)
    if (at) menu.open({ ...at, ...spec() })
  }
  return span(
    { class: 'flex min-w-0' },
    navButton(
      { class: '-ml-2', title, 'aria-haspopup': 'menu', ...menu.target(spec, openBelow) },
      titleText(title),
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 14)),
    ),
    menu.view(),
  )
}

export const breadcrumb = (ctx: ChatContext, shell: Shell, changes: Pulse, id: string | undefined) => {
  const thread = () => (id ? ctx.threads.get(id) : undefined)
  const lead = changes.read(() => leadOf(ctx, thread()))
  const parent = changes.read(() => parentOf(ctx, thread()))
  const title = changes.read(() => threadTitle(thread()))
  return div(
    { class: 'flex min-w-0 flex-1 items-center gap-2 text-sm' },
    show(lead.map(Boolean), () => leadCrumb(ctx, lead, parent)),
    show(parent.map(Boolean), () => parentCrumb(ctx, shell, parent)),
    id ? titleMenu(ctx, shell, id, title) : titleText(title),
  )
}
