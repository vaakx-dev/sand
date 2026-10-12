import { tildeHome } from '@sand/kit'
import type { Pulse } from '@sand/kit/web'
import type { LayoutState } from '@sand/protocol'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { renameSession, sessionMenu } from './menu'
import { parentCrumb, parentOf } from './parent'
import { currentPlace, isQuick, type Place, projectLook, projectName, quickName } from './project'
import type { Slots } from './slots'

const sideHidden = (state: LayoutState | undefined) => Boolean(state?.filled.side && (state.narrow || !state.open.side))

const agentsWorking = (ctx: Context) =>
  Boolean(ctx.jobs?.list().some(job => job.status === 'running') || ctx.threads?.list().some(thread => thread.info.kind === 'agent' && thread.running))

const projectCrumb = (ctx: Context<'kit'>, changes: Pulse, place: Sig<Place | undefined>, name: Sig<string>) => {
  const { projectAvatar } = ctx.kit
  return span(
    { class: 'hidden max-w-48 shrink-0 items-center gap-1.5 text-neutral-400 md:flex', title: place.map(at => tildeHome(at?.cwd ?? '')) },
    projectAvatar(name, changes.read(() => projectLook(ctx, place.get()))),
    span({ class: 'truncate' }, name),
  )
}

const titleMenu = (ctx: Context<'kit'>, title: Sig<string>) => {
  const { dropdown, icon, navButton } = ctx.kit
  return dropdown({
    trigger: (press, open) =>
      navButton(
        {
          active: open,
          title,
          ...press,
          onDblClick: () => void renameSession(ctx),
        },
        span({ class: 'min-w-0 truncate font-semibold text-neutral-100' }, title),
        span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 14)),
      ),
    items: close => sessionMenu(ctx, close),
  })
}

const panelButton = (ctx: Context<'kit'>, changes: Pulse, hidden: Sig<boolean>) => {
  const { dot, icon, iconButton } = ctx.kit
  return iconButton(
    { class: 'relative', hidden, title: 'Show the panel', 'aria-label': 'Show the panel', onClick: () => ctx.layout?.toggle('aside', true) },
    icon('panel'),
    show(changes.read(() => agentsWorking(ctx)), () => span({ class: 'absolute right-1 top-1 flex', title: 'Running in the background' }, dot('accent'))),
  )
}

export const headerView = (ctx: Context<'kit'>, changes: Pulse, slots: Slots) => {
  const { layer, paneHead, showSideButton } = ctx.kit
  const place = changes.read(() => currentPlace(ctx))
  const quick = changes.read(() => isQuick(ctx, place.get()))
  const idle = changes.read(() => Boolean(ctx.threads?.idle()))
  const untitled = changes.read(() => {
    const thread = ctx.threads?.current()
    return Boolean(thread && !thread.info.title)
  })
  const name = changes.read(() => (quick.get() && untitled.get() && !idle.get() ? '' : projectName(ctx, place.get())))
  const title = changes.read(() => {
    if (!ctx.threads) return 'sand'
    const thread = ctx.threads.current()
    if (!thread) return 'New thread'
    return thread.info.title ?? (quick.get() ? quickName : 'Untitled thread')
  })
  const layout = changes.read(() => ctx.layout?.state())
  const narrow = layout.map(state => state?.narrow ?? false)
  const led = layout.map(sideHidden)

  return paneHead(
    { led, class: [layer.sticky, 'relative min-w-0'] },
    show(led, () => showSideButton(narrow, 'Threads', () => ctx.layout?.toggle('side'))),
    div(
      { class: 'flex min-w-0 flex-1 items-center gap-2 text-sm' },
      show(name.map(Boolean), () => projectCrumb(ctx, changes, place, name)),
      show(
        () => Boolean(name.get()) && !idle.get(),
        () => span({ class: 'hidden text-neutral-500 md:inline' }, '/'),
      ),
      parentCrumb(ctx, changes.read(() => parentOf(ctx))),
      show(
        () => !idle.get(),
        () => titleMenu(ctx, title),
      ),
    ),
    slots.host(),
    panelButton(
      ctx,
      changes,
      layout.map(state => !state?.filled.aside || state.open.aside),
    ),
  )
}
