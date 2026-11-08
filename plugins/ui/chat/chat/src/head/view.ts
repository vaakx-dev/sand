import type { Pulse } from '@sand/reactive'
import type { Thread } from '@sand/web-client/contract'
import { tildeHome } from '@sand/util'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import { renameThread, threadMenu } from './menu'
import { placeOf, projectLook, projectName, threadTitle, type Place } from './place'

interface ParentLink {
  id: string
  title: string
}

const parentOf = (ctx: ChatContext, thread: Thread | undefined): ParentLink | undefined => {
  const info = thread?.info
  if (info?.kind !== 'agent' || !info.parent) return undefined
  return { id: info.parent, title: ctx.threads.get(info.parent)?.info.title || 'Untitled thread' }
}

const parentCrumb = (ctx: ChatContext, parent: Sig<ParentLink | undefined>, open: (thread: string) => void) => {
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
          if (link) open(link.id)
        },
      },
      icon('up', 14),
      span({ class: 'hidden min-w-0 truncate md:inline' }, () => `Sub-agent of ${parent.get()?.title ?? ''}`),
    ),
  )
}

const projectCrumb = (ctx: ChatContext, changes: Pulse, place: Sig<Place | undefined>, name: Sig<string>) =>
  span(
    { class: 'hidden max-w-48 shrink-0 items-center gap-2 text-neutral-400 md:flex', title: place.map(at => tildeHome(at?.cwd ?? '')) },
    ctx.kit.projectAvatar(name, changes.read(() => projectLook(ctx, place.get()))),
    span({ class: 'truncate' }, name),
  )

const titleMenu = (ctx: ChatContext, id: string | undefined, title: Sig<string>) => {
  const { dropdown, icon, navButton } = ctx.kit
  return dropdown({
    trigger: (press, open) =>
      navButton(
        { active: open, title, ...press, onDblClick: () => void renameThread(ctx, id) },
        span({ class: 'min-w-0 truncate font-medium text-neutral-100' }, title),
        span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 14)),
      ),
    items: close => threadMenu(ctx, id, close),
  })
}

export const breadcrumb = (ctx: ChatContext, changes: Pulse, id: string | undefined, open: (thread: string) => void) => {
  const thread = () => (id ? ctx.threads.get(id) : undefined)
  const place = changes.read(() => placeOf(ctx, thread()))
  const name = changes.read(() => projectName(ctx, place.get()))
  const parent = changes.read(() => parentOf(ctx, thread()))
  return div(
    { class: 'flex min-w-0 flex-1 items-center gap-2 text-sm' },
    show(name.map(Boolean), () => projectCrumb(ctx, changes, place, name)),
    show(name.map(Boolean), () => span({ class: 'hidden text-neutral-500 md:inline' }, '/')),
    parentCrumb(ctx, parent, open),
    titleMenu(ctx, id, changes.read(() => threadTitle(thread()))),
  )
}
