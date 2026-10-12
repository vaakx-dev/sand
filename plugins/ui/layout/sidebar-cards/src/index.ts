import { closeDrawer, owned, place, pulse, reorder } from '@sand/kit/web'
import type {} from '@sand/nav/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import type { CardMenu } from './card/menu'
import { choiceName, projectChoices } from './project/choices'
import { projectFilter } from './project/filter'
import { chipMenu, choiceMenu } from './project/menu'
import { buildRows, cardsIn, openByDefault, pageSize, pageStep } from './rows/build'
import { sectionState } from './rows/sections'
import { sidebarView } from './view'

export default definePlugin({
  name: 'sidebar-cards',
  description: 't3-style card sidebar: search, project filter and actions, then Pinned, Active, Snoozed and Settled threads',
  inject: ['nav', 'kit'],
  uses: {
    layout: 'lands loose on the stage',
    projects: 'the project filter lists only projects that have threads',
    threads: 'project menus offer no New thread here',
    composer: 'New thread here does not focus the prompt',
    notify: 'failed project actions are not reported',
  },
  apply(ctx) {
    const nav = ctx.nav
    const layout = pulse(ctx, ['layout.change'], ['layout'])
    const registry = pulse(ctx, ['projects.change'], ['projects'])
    const menu = sig<CardMenu | undefined>(undefined)
    const limits = sig<Record<string, number>>({})
    const { sections, filter, rows, choices, label } = owned(ctx, () => {
      const sections = sectionState()
      const filter = projectFilter()
      const choices = derive(() => {
        registry.version.get()
        return projectChoices(ctx, nav.lists.get())
      })
      const label = derive(() => choiceName(choices.get(), filter.project.get()))
      const rows = derive(() =>
        buildRows(nav.lists.get(), {
          project: filter.project.get(),
          isOpen: sections.isOpen,
          limit: key => limits.get()[key] ?? pageSize,
        }),
      )
      return { sections, filter, rows, choices, label }
    })
    const drag = reorder({
      axis: 'y',
      siblings: group => cardsIn(rows.get(), group).map(row => row.item.id),
      move: (group, id, above, below) => cardsIn(rows.get(), group)[0]?.list.move?.(id, above, below),
    })
    const view = () =>
      sidebarView(ctx.kit, {
        drag,
        menu,
        narrow: layout.read(() => ctx.layout?.state().narrow ?? false),
        actions: nav.actions,
        rows,
        projects: choices,
        project: filter.project,
        label,
        filter: filter.set,
        choiceMenu: (choice, done) => choiceMenu(ctx, choice, filter.project.get() === choice.key, { filter: filter.set, done, leave: () => closeDrawer(ctx) }),
        chipMenu: () => chipMenu(ctx, filter.project.get(), label.get(), { filter: filter.set, done: () => {}, leave: () => {} }),
        hide: () => ctx.layout?.toggle('side', false),
        run(action) {
          nav.run(action)
          closeDrawer(ctx)
        },
        busy: nav.busy,
        pick: row => row.list.select(row.item.id),
        toggle: row => sections.toggle(row.key, openByDefault(row.name)),
        more: row => limits.update(current => ({ ...current, [row.section]: (current[row.section] ?? pageSize) + pageStep })),
      })
    const sidebar = {}
    ctx.provide('sidebar', sidebar)
    ctx.watch('sidebar', current => (current === sidebar ? place(ctx, 'side', view) : undefined))
  },
})
