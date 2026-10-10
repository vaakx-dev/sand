import { button, derive, div, dropdown, dynamicChild, icon, iconButton, layer, projectIcon, show, sidebarToggle, span, tildeHome, type Pulse } from '@sand/dom'
import type { Context } from 'drydock'
import { agentsWorking } from './activity'
import { renameSession, sessionMenu } from './menu'
import { parentCrumb, parentOf } from './parent'
import { isQuick, pcLabel, projectIconUrl, projectName, quickName } from './project'
import type { Slots } from './slots'

export const headerView = (ctx: Context, changes: Pulse, branchOf: (cwd: string | undefined) => string | undefined, slots: Slots) => {
  const cwd = changes.read(() => {
    const threads = ctx.threads
    return threads ? (threads.current()?.info.cwd ?? threads.cwd()) : undefined
  })
  const quick = changes.read(() => isQuick(ctx, cwd.get()))
  const idle = changes.read(() => Boolean(ctx.threads?.idle()))
  const untitled = changes.read(() => {
    const thread = ctx.threads?.current()
    return Boolean(thread && !thread.info.title)
  })
  const name = changes.read(() => (quick.get() && untitled.get() && !idle.get() ? '' : projectName(ctx, cwd.get())))
  const title = changes.read(() => {
    const threads = ctx.threads
    const thread = threads?.current()
    if (!threads) return 'sand'
    if (!thread) return 'New thread'
    return thread.info.title ?? (quick.get() ? quickName : 'Untitled thread')
  })
  const parent = changes.read(() => parentOf(ctx))
  const working = changes.read(() => agentsWorking(ctx))
  const branch = changes.read(() => (slots.filled.get() ? '' : (branchOf(cwd.get()) ?? '')))
  const layout = changes.read(() => ctx.layout?.state())
  const narrow = layout.map(state => state?.narrow ?? false)

  const showSide = () => ctx.layout?.toggle('side')
  const sideHidden = derive(() => Boolean(layout.get()?.filled.side) && (narrow.get() || !layout.get()?.open.side))
  const menu = show(sideHidden, () =>
    dynamicChild(narrow, value =>
      value
        ? iconButton({ title: 'Threads', 'aria-label': 'Threads', onClick: showSide }, icon('menu'))
        : sidebarToggle({ title: 'Show the sidebar', 'aria-label': 'Show the sidebar', onClick: showSide }),
    ),
  )
  const project = show(name.map(Boolean), () =>
    span(
      { class: 'hidden max-w-48 shrink-0 items-center gap-2 text-neutral-400 md:flex', title: cwd.map(path => tildeHome(path ?? '')) },
      dynamicChild(
        changes.read(() => projectIconUrl(ctx, cwd.get())),
        url => (url ? projectIcon('', url) : dynamicChild(name, projectIcon)),
      ),
      span({ class: 'truncate' }, name),
    ),
  )
  const pc = changes.read(() => pcLabel(ctx, cwd.get()))
  const machine = show(pc.map(Boolean), () =>
    span(
      { class: 'flex max-w-32 shrink-0 items-center gap-1 text-xs text-neutral-500', title: pc.map(name => `Runs on ${name}`) },
      icon('monitor', 13),
      span({ class: 'truncate' }, pc),
    ),
  )
  const slash = show(derive(() => Boolean(name.get()) && !idle.get()), () => span({ class: 'hidden text-neutral-500 md:inline' }, '/'))
  const branchName = show(branch.map(Boolean), () =>
    span(
      { class: 'hidden max-w-48 shrink-0 items-center gap-1 text-xs text-neutral-500 md:inline-flex', title: branch.map(value => `Branch ${value}`) },
      icon('branch', 13),
      span({ class: 'truncate' }, branch),
    ),
  )
  const titleDropdown = () => dropdown({
    trigger: (toggle, open) =>
      button(
        {
          type: 'button',
          class: [
            'flex h-8 min-w-0 items-center gap-1 rounded-lg px-2 cursor-pointer outline-none hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-accent-500',
            () => (open.get() ? 'bg-neutral-800' : ''),
          ],
          title,
          onClick: toggle,
          onDblClick: () => void renameSession(ctx),
        },
        span({ class: 'min-w-0 truncate font-semibold text-neutral-100' }, title),
        span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 14)),
      ),
      items: close => sessionMenu(ctx, close),
    })
  const titleMenu = show(idle.map(value => !value), () => titleDropdown())
  const panel = iconButton(
    {
      class: 'relative',
      hidden: layout.map(state => !state?.filled.aside || state.open.aside),
      title: 'Show the panel',
      'aria-label': 'Show the panel',
      onClick: () => ctx.layout?.toggle('aside', true),
    },
    icon('panel'),
    show(working, () => span({ class: 'absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-400', title: 'Agents running' })),
  )

  return div(
    { class: [layer.sticky, 'relative flex h-12 min-w-0 shrink-0 items-center gap-2 pr-3', () => (sideHidden.get() ? 'pl-2' : 'pl-4')] },
    menu,
    div(
      { class: 'flex min-w-0 flex-1 items-center gap-2 text-sm' },
      project,
      machine,
      slash,
      parentCrumb(ctx, parent),
      titleMenu,
    ),
    branchName,
    slots.host(),
    panel,
  )
}
