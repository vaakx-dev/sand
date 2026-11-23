import type { Pulse } from '@sand/reactive'
import type { Shell } from '@sand/ui-shell/contract'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import type { ThreadView } from '../contract'
import { threadActions } from './menu'

interface ParentLink {
  id: string
  title: string
}

interface HeadParts {
  shell: Shell
  view: ThreadView
  changes: Pulse
}

const parentOf = (ctx: ChatContext, view: ThreadView, id: string): ParentLink | undefined => {
  const info = ctx.threads.get(id)?.info
  if (info?.kind !== 'agent' || !info.parent) return undefined
  return { id: info.parent, title: view.title(info.parent) }
}

const parentCrumb = (ctx: ChatContext, view: ThreadView, parent: Sig<ParentLink | undefined>) =>
  span(
    { class: 'flex shrink-0 items-center gap-2' },
    ctx.kit.linkButton(
      {
        class: 'flex max-w-32 md:max-w-40',
        title: () => `Back to ${parent.get()?.title ?? 'the parent thread'}`,
        onClick: () => {
          const link = parent.get()
          if (link) view.open(link.id)
        },
      },
      ctx.kit.rowTitle(() => parent.get()?.title ?? ''),
    ),
    span({ class: 'shrink-0' }, '/'),
  )

const titleMenu = (ctx: ChatContext, { shell, view }: HeadParts, id: string, title: Sig<string>) => {
  const { contextMenu, titleButton } = ctx.kit
  const menu = contextMenu()
  const spec = () => ({ title: title.get(), actions: threadActions(ctx, { shell, view }, id) })
  return [titleButton({ title, 'aria-haspopup': 'menu', ...menu.target(spec, event => menu.openBelow(event, spec)) }, title), menu.view()]
}

export const breadcrumb = (ctx: ChatContext, parts: HeadParts, id: string) => {
  const { view, changes } = parts
  const parent = changes.read(() => parentOf(ctx, view, id))
  const title = changes.read(() => (ctx.threads.get(id) ? view.title(id) : ''))
  return div(
    { class: 'flex min-w-0 flex-1 items-center gap-2 text-sm text-neutral-500' },
    show(parent.map(Boolean), () => parentCrumb(ctx, view, parent)),
    titleMenu(ctx, parts, id, title),
  )
}
