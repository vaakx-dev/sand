import { appIcon, derive, div, dropdown, dynamicChild, icon, iconButton, layer, plainButton, projectAvatar, show, sidebarToggle, span, tildeHome, type Pulse, type Sig } from '@sand/dom'
import type { Context } from 'drydock'
import { renameSession, sessionMenu } from './menu'
import { parentCrumb, parentOf } from './parent'
import { isQuick, projectIconUrl, projectName, quickName } from './project'
import type { Slots } from './slots'

const agentsWorking = (ctx: Context) =>
  Boolean(ctx.jobs?.list().some(job => job.status === 'running') || ctx.threads?.list().some(thread => thread.info.kind === 'agent' && thread.running))

const sidebarButton = (narrow: Sig<boolean>, onClick: () => void) =>
  dynamicChild(narrow, value =>
    value ? iconButton({ title: 'Threads', 'aria-label': 'Threads', onClick }, appIcon(20)) : sidebarToggle({ title: 'Show the sidebar', 'aria-label': 'Show the sidebar', onClick }),
  )

const projectCrumb = (ctx: Context, changes: Pulse, cwd: Sig<string | undefined>, name: Sig<string>) =>
  span(
    { class: 'hidden max-w-48 shrink-0 items-center gap-2 text-neutral-400 md:flex', title: cwd.map(path => tildeHome(path ?? '')) },
    projectAvatar(name, changes.read(() => projectIconUrl(ctx, cwd.get()))),
    span({ class: 'truncate' }, name),
  )

const titleMenu = (ctx: Context, title: Sig<string>) =>
  dropdown({
    trigger: (press, open) =>
      plainButton(
        {
          class: ['flex h-8 min-w-0 items-center gap-1 rounded-lg px-2 hover:bg-neutral-800', () => (open.get() ? 'bg-neutral-800' : '')],
          title,
          ...press,
          onDblClick: () => void renameSession(ctx),
        },
        span({ class: 'min-w-0 truncate font-semibold text-neutral-100' }, title),
        span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 14)),
      ),
    items: close => sessionMenu(ctx, close),
  })

const panelButton = (ctx: Context, changes: Pulse, hidden: Sig<boolean>) =>
  iconButton(
    { class: 'relative', hidden, title: 'Show the panel', 'aria-label': 'Show the panel', onClick: () => ctx.layout?.toggle('aside', true) },
    icon('panel'),
    show(changes.read(() => agentsWorking(ctx)), () => span({ class: 'absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-400', title: 'Agents running' })),
  )

export const headerView = (ctx: Context, changes: Pulse, slots: Slots) => {
  const cwd = changes.read(() => ctx.threads?.current()?.info.cwd ?? ctx.threads?.cwd())
  const quick = changes.read(() => isQuick(ctx, cwd.get()))
  const idle = changes.read(() => Boolean(ctx.threads?.idle()))
  const untitled = changes.read(() => {
    const thread = ctx.threads?.current()
    return Boolean(thread && !thread.info.title)
  })
  const name = changes.read(() => (quick.get() && untitled.get() && !idle.get() ? '' : projectName(ctx, cwd.get())))
  const title = changes.read(() => {
    if (!ctx.threads) return 'sand'
    const thread = ctx.threads.current()
    if (!thread) return 'New thread'
    return thread.info.title ?? (quick.get() ? quickName : 'Untitled thread')
  })
  const layout = changes.read(() => ctx.layout?.state())
  const narrow = layout.map(state => state?.narrow ?? false)
  const sideHidden = derive(() => Boolean(layout.get()?.filled.side) && (narrow.get() || !layout.get()?.open.side))

  return div(
    { class: [layer.sticky, 'relative flex h-12 min-w-0 shrink-0 items-center gap-2 pr-3', () => (sideHidden.get() ? 'pl-2' : 'pl-4')] },
    show(sideHidden, () => sidebarButton(narrow, () => ctx.layout?.toggle('side'))),
    div(
      { class: 'flex min-w-0 flex-1 items-center gap-2 text-sm' },
      show(name.map(Boolean), () => projectCrumb(ctx, changes, cwd, name)),
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
