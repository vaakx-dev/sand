import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import { connectItem } from './flow/connect'
import { sourcesPage } from './flow/sources'
import type { FlowContext } from './flow/types'

const newProject = (ctx: FlowContext, group?: string): PaletteItem => ({
  id: 'project:new',
  group,
  icon: 'folder-plus',
  label: 'New project',
  search: 'new add project folder clone git url repository environment create',
  page: () => sourcesPage(ctx),
})

const items = (ctx: FlowContext, group: string): PaletteItem[] => [newProject(ctx, group), connectItem(ctx, group)]

export const projectSource = (ctx: FlowContext): PaletteSource => ({
  id: 'new-project',
  order: 12,
  items(query) {
    if (query.startsWith('/')) return []
    if (!query.trim()) return items(ctx, '').slice(0, 1)
    return items(ctx, 'Actions')
  },
})

export const newThreadSource = (ctx: FlowContext): PaletteSource => ({
  id: 'new-project:new-thread',
  page: 'new-thread',
  items: () => [newProject(ctx)],
})
