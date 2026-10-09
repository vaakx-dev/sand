import { closeDrawer, derive, effect, navHost, owned, place, pulse, reorder, sig } from '@sand/dom'
import { definePlugin } from 'drydock'
import { choiceName, projectChoices } from './project-choices'
import { projectFilter } from './project-filter'
import { buildRows, cardsIn, type RowOptions } from './rows'
import { sectionState } from './sections'
import { sidebarView } from './view'

const pageSize = 25

export default definePlugin({
  name: 'sidebar-cards',
  description: 't3-style card sidebar: search, project filter and actions, then Pinned, Active and Settled threads',
  uses: {
    layout: 'lands loose on the stage',
    projects: 'the project filter lists only projects that have threads',
  },
  apply(ctx) {
    const host = navHost(ctx)
    const layout = pulse(ctx, ['layout.change'], ['layout'])
    const registry = pulse(ctx, ['projects.change'], ['projects'])
    const { sections, limits, filter, rows, choices, label } = owned(ctx, () => {
      const sections = sectionState()
      const limits = sig<Record<string, number>>({})
      const filter = projectFilter()
      const choices = derive(() => {
        registry.version.get()
        return projectChoices(ctx, host.lists.get())
      })
      const label = derive(() => choiceName(choices.get(), filter.project.get()))
      effect(() => {
        const found = choices.get()
        if (!ctx.projects || ctx.projects.groups({ hidden: true }).length) filter.migrate(found)
      })
      const options = (): RowOptions => ({
        project: filter.project.get(),
        isOpen: sections.isOpen,
        limit: key => limits.get()[key] ?? pageSize,
      })
      const rows = derive(() => buildRows(host.lists.get(), options()))
      return { sections, limits, filter, rows, choices, label }
    })
    const drag = reorder({
      axis: 'y',
      siblings: group => cardsIn(rows.get(), group).map(row => row.item.id),
      move: (group, id, above, below) => cardsIn(rows.get(), group)[0]?.list.move?.(id, above, below),
    })
    const view = () =>
      sidebarView({
        drag,
        narrow: layout.read(() => ctx.layout?.state().narrow ?? false),
        actions: host.actions,
        rows,
        projects: choices,
        project: filter.project,
        label,
        filter: filter.set,
        hide: () => ctx.layout?.toggle('side', false),
        run(action) {
          host.run(action)
          closeDrawer(ctx)
        },
        busy: host.busy,
        pick(row) {
          row.list.select(row.item.id)
          closeDrawer(ctx)
        },
        toggle: row => sections.toggle(row.key, row.name !== 'Settled'),
        more: row => limits.update(current => ({ ...current, [row.section]: (current[row.section] ?? pageSize) + pageSize * 2 })),
      })
    ctx.provide('nav', host.nav)
    ctx.watch('nav', nav => (nav === host.nav ? place(ctx, 'side', view) : undefined))
  },
})
