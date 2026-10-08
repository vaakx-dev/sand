import type { Machine, PaletteItem, PalettePage } from '@sand/protocol'
import { emptyPage } from './empty'
import { folderPage } from './folder'
import { gitPage } from './git'
import { reviewPage } from './review'
import type { FlowContext, Source } from './types'
import { wherePage } from './where'

const sourcePage = (ctx: FlowContext, source: Source, machine: Machine): PalettePage => {
  const next = (choice: Parameters<typeof reviewPage>[1]) => reviewPage(ctx, choice)
  if (source === 'Git URL') return gitPage(ctx, machine, next)
  if (source === 'Empty project') return emptyPage(ctx, machine, next)
  return folderPage(ctx, machine, next, { mode: 'add' })
}

const sourceItem = (ctx: FlowContext, source: Source, icon: string, search: string): PaletteItem => ({
  id: `source:${source}`,
  icon,
  label: source,
  search,
  page: () => wherePage(ctx, machine => sourcePage(ctx, source, machine)),
})

export const sourcesPage = (ctx: FlowContext): PalettePage => ({
  id: 'sources',
  title: 'Source',
  placeholder: 'Search…',
  empty: 'No matching sources.',
  items: () => [
    sourceItem(ctx, 'Local folder', 'folder-plus', 'local folder directory browse'),
    sourceItem(ctx, 'Git URL', 'link', 'git url clone remote repository github'),
    sourceItem(ctx, 'Empty project', 'folder-git', 'new empty create git init'),
  ],
})
