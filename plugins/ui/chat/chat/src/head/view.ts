import type { Pulse } from '@sand/reactive'
import type { PressAt } from '@sand/ui-kit/contract'
import type { Shell } from '@sand/ui-shell/contract'
import type { Thread } from '@sand/web-client/contract'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import { threadRoute } from '../contract'
import { threadActions, threadTitle } from './menu'

interface ParentLink {
  id: string
  title: string
}

const parentOf = (ctx: ChatContext, thread: Thread | undefined): ParentLink | undefined => {
  const info = thread?.info
  if (info?.kind !== 'agent' || !info.parent) return undefined
  return { id: info.parent, title: ctx.threads.get(info.parent)?.info.title || 'Untitled thread' }
}

const parentCrumb = (ctx: ChatContext, shell: Shell, parent: Sig<ParentLink | undefined>) =>
  span(
    { class: 'flex shrink-0 items-center gap-2' },
    ctx.kit.linkButton(
      {
        class: 'flex max-w-32 md:max-w-40',
        title: () => `Back to ${parent.get()?.title ?? 'the parent thread'}`,
        onClick: () => {
          const link = parent.get()
          if (link) shell.open({ kind: threadRoute, id: link.id })
        },
      },
      ctx.kit.rowTitle(() => parent.get()?.title ?? ''),
    ),
    span({ class: 'shrink-0' }, '/'),
  )

const below = (event: MouseEvent): PressAt | undefined => {
  const from = event.currentTarget
  if (!(from instanceof HTMLElement)) return undefined
  const box = from.getBoundingClientRect()
  return { x: box.left, y: box.bottom + 4, touch: event instanceof PointerEvent && event.pointerType === 'touch', from }
}

const titleMenu = (ctx: ChatContext, shell: Shell, id: string, title: Sig<string>) => {
  const { barTitle, contextMenu, navButton } = ctx.kit
  const menu = contextMenu()
  const spec = () => ({ title: title.get(), actions: threadActions(ctx, shell, id) })
  const openBelow = (event: MouseEvent) => {
    const at = below(event)
    if (at) menu.open({ ...at, ...spec() })
  }
  return span(
    { class: 'flex min-w-0' },
    navButton({ class: '-ml-2', title, 'aria-haspopup': 'menu', ...menu.target(spec, openBelow) }, barTitle(title)),
    menu.view(),
  )
}

export const breadcrumb = (ctx: ChatContext, shell: Shell, changes: Pulse, id: string) => {
  const thread = () => ctx.threads.get(id)
  const parent = changes.read(() => parentOf(ctx, thread()))
  const title = changes.read(() => {
    const found = thread()
    return found ? threadTitle(found) : ''
  })
  return div(
    { class: 'flex min-w-0 flex-1 items-center gap-2 text-sm text-neutral-500' },
    show(parent.map(Boolean), () => parentCrumb(ctx, shell, parent)),
    titleMenu(ctx, shell, id, title),
  )
}
