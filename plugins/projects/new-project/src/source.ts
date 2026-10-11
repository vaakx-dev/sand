import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import type { ProjectsContext } from './context'
import { connectItem } from './flow/connect'
import { sourcesPage } from './flow/sources'

const newProject = (ctx: ProjectsContext, group?: string): PaletteItem => ({
  id: 'project:new',
  group,
  icon: 'folder-plus',
  label: 'New project',
  search: 'new add project folder clone git url repository environment create',
  page: () => sourcesPage(ctx),
})

export const projectSource = (ctx: ProjectsContext): PaletteSource => ({
  id: 'new-project',
  order: 12,
  items(query) {
    if (query.startsWith('/')) return []
    if (!query.trim()) return [newProject(ctx, '')]
    return [newProject(ctx, 'Actions'), connectItem(ctx, 'Actions')]
  },
})

export const newThreadSource = (ctx: ProjectsContext): PaletteSource => ({
  id: 'new-project:new-thread',
  page: 'new-thread',
  items: () => [newProject(ctx)],
})
