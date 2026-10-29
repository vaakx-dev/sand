import { layout, type LayoutState } from '@sand/layout/contract'
import type { kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { threads } from '@sand/web-client/contract'
import type { Pulse } from '@sand/web-client/reactive'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { chatMenu, renameThread } from './menu'
import { parentCrumb, parentOf, type ParentLink } from './parent'
import { currentPlace, type Place, projectLook, projectName, threadTitle } from './project'
import type { Slots } from './slots'

type HeaderContext = Context<{ kit: typeof kit }>

const sideHidden = (state: LayoutState | undefined) => Boolean(state?.filled.side && (state.narrow || !state.open.side))

const projectCrumb = (ctx: HeaderContext, changes: Pulse, place: Sig<Place | undefined>, name: Sig<string>) =>
  span(
    { class: 'hidden max-w-48 shrink-0 items-center gap-1.5 text-neutral-400 md:flex', title: place.map(at => tildeHome(at?.cwd ?? '')) },
    ctx.kit.projectAvatar(name, changes.read(() => projectLook(ctx, place.get()))),
    span({ class: 'truncate' }, name),
  )

const titleEdge = (name: Sig<string>, parent: Sig<ParentLink | undefined>) => () => {
  if (parent.get()) return ''
  return name.get() ? '-ml-2 md:ml-0' : '-ml-2'
}

const titleMenu = (ctx: HeaderContext, title: Sig<string>, edge: () => string) => {
  const { dropdown, icon, navButton } = ctx.kit
  return dropdown({
    trigger: (press, open) =>
      navButton(
        { active: open, title, class: edge, ...press, onDblClick: () => void renameThread(ctx) },
        span({ class: 'min-w-0 truncate font-medium text-neutral-100' }, title),
        span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 14)),
      ),
    items: close => chatMenu(ctx, close),
  })
}

export const headerView = (ctx: HeaderContext, changes: Pulse, slots: Slots) => {
  const { layer, paneHead, showSideButton } = ctx.kit
  const place = changes.read(() => currentPlace(ctx))
  const name = changes.read(() => projectName(ctx, place.get()))
  const title = changes.read(() => (ctx.get(threads) ? threadTitle(ctx) : 'Sand'))
  const parent = changes.read(() => parentOf(ctx))
  const state = changes.read(() => ctx.get(layout)?.state())
  const narrow = state.map(value => value?.narrow ?? false)
  const led = state.map(sideHidden)

  return paneHead(
    { led, class: [layer.sticky, 'relative min-w-0'] },
    show(led, () => showSideButton(narrow, 'Threads', () => ctx.get(layout)?.toggle('side'))),
    div(
      { class: 'flex min-w-0 flex-1 items-center gap-2 text-sm' },
      show(name.map(Boolean), () => projectCrumb(ctx, changes, place, name)),
      show(name.map(Boolean), () => span({ class: 'hidden text-neutral-500 md:inline' }, '/')),
      parentCrumb(ctx, parent),
      titleMenu(ctx, title, titleEdge(name, parent)),
      slots.host('start'),
    ),
    slots.host('end'),
  )
}
