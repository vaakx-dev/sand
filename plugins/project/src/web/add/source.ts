import type { PaletteItem, PaletteSource } from '@sand/palette/contract'

const newProject = (open: () => void, group?: string): PaletteItem => ({
  id: 'project:new',
  group,
  icon: 'folder-plus',
  label: 'Add project',
  search: 'new add project folder pc create',
  run: open,
})

export const projectSource = (open: () => void): PaletteSource => ({
  id: 'new-project',
  order: 12,
  items(query) {
    if (query.startsWith('/')) return []
    if (!query.trim()) return [newProject(open, '')]
    return [newProject(open, 'Actions')]
  },
})

export const newThreadSource = (open: () => void): PaletteSource => ({
  id: 'new-project:new-thread',
  page: 'new-thread',
  items: () => [newProject(open)],
})
