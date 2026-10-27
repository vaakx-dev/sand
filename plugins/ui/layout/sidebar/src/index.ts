import { draftsChange, drafts } from '@sand/composer/contract'
import { jobs, jobsChange } from '@sand/jobs/contract'
import { layout, layoutChange } from '@sand/layout/contract'
import { closeDrawer, place } from '@sand/layout/place'
import { nav, sidebar } from '@sand/nav/contract'
import { palette } from '@sand/palette/contract'
import { kit } from '@sand/ui-kit/contract'
import { machines, machinesChange, projects, projectsChange, threadSelect, threads, threadsChange } from '@sand/web-client/contract'
import { owned, pulse } from '@sand/web-client/reactive'
import { derive, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import type { CardMenu } from './card/menu'
import { threadList } from './items/list'
import { newThreadPage } from './palette/projects'
import { sessionSource } from './palette/source'
import { choiceName, projectChoices } from './project/choices'
import { projectFilter } from './project/filter'
import { chipMenu, choiceMenu } from './project/menu'
import { buildRows, cardsIn, openByDefault, pageSize, pageStep } from './rows/build'
import { reorder } from './rows/reorder'
import { sectionState } from './rows/sections'
import { wakeTimer } from './snooze/wake'
import { sidebarView } from './view'

export default definePlugin({
  name: 'sidebar',
  description: 'Card sidebar: search, project filter and actions, then Pinned, Active, Snoozed and Settled threads, and threads and projects in the palette',
  inject: { nav, kit, threads },
  apply(ctx) {
    const shell = pulse(ctx, [layoutChange], [layout])
    const changes = pulse(ctx, [projectsChange, threadsChange, threadSelect, machinesChange, draftsChange, jobsChange], [projects, machines, drafts, jobs])
    const list = threadList(ctx, ctx.kit, ctx.threads)
    const menu = sig<CardMenu | undefined>(undefined)
    const limits = sig<Record<string, number>>({})
    const { sections, filter, rows, choices, label } = owned(ctx, () => {
      const sections = sectionState()
      const filter = projectFilter()
      const items = changes.read(() => list.items())
      const selected = changes.read(() => list.selected())
      const choices = derive(() => projectChoices(ctx, items.get()))
      const label = derive(() => choiceName(choices.get(), filter.project.get()))
      const rows = derive(() =>
        buildRows(items.get(), {
          project: filter.project.get(),
          selected: selected.get(),
          isOpen: sections.isOpen,
          limit: key => limits.get()[key] ?? pageSize,
        }),
      )
      return { sections, filter, rows, choices, label }
    })
    const drag = reorder({
      siblings: group => cardsIn(rows.get(), group).map(row => row.item.id),
      move: list.move,
    })
    const create = () => {
      const found = ctx.get(palette)
      if (found) found.open(newThreadPage(ctx, ctx.threads))
      else void list.newThread()
    }
    const done = () => {}

    const view = () =>
      sidebarView(ctx.kit, {
        drag,
        menu,
        narrow: shell.read(() => ctx.get(layout)?.state().narrow ?? false),
        actions: ctx.nav.actions,
        rows,
        projects: choices,
        project: filter.project,
        label,
        filter: filter.set,
        choiceMenu: (choice, close) =>
          choiceMenu(ctx, ctx.threads, choice, filter.project.get() === choice.key, { filter: filter.set, done: close, leave: () => closeDrawer(ctx) }),
        chipMenu: () => chipMenu(ctx, filter.project.get(), label.get(), { filter: filter.set, done, leave: done }),
        hide: () => ctx.get(layout)?.toggle('side', false),
        create,
        run(action) {
          ctx.nav.run(action)
          closeDrawer(ctx)
        },
        busy: ctx.nav.busy,
        pick(row) {
          list.select(row.item.id)
          closeDrawer(ctx)
        },
        prefetch: list.prefetch,
        menuOf: list.menuOf,
        toggle: row => sections.toggle(row.key, openByDefault(row.name)),
        more: row => limits.update(current => ({ ...current, [row.section]: (current[row.section] ?? pageSize) + pageStep })),
      })
    const own = {}
    ctx.provide(sidebar, own)
    ctx.watch(sidebar, current => (current === own ? place(ctx, 'side', view) : undefined))
    ctx.effect(() => ctx.nav.action({ id: 'new-thread', label: 'New thread', icon: 'compose', order: 20, run: create }))
    ctx.watch(palette, found => found?.source(sessionSource(ctx, ctx.kit, ctx.threads)))
    wakeTimer(ctx, () => ctx.threads, changes.bump)
  },
})
