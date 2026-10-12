import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { Machine } from '@sand/web-client/contract'
import type { ProjectsContext } from '../context'
import { emptyPage } from './empty'
import { folderPage } from './folder'
import { gitPage } from './git'
import { suggestPage } from './match'
import type { Choice, Source } from './types'
import { wherePage } from './where'

const sourcePage = (ctx: ProjectsContext, source: Source, machine: Machine): PalettePage => {
  const next = (choice: Choice) => suggestPage(ctx, choice)
  if (source === 'Git URL') return gitPage(ctx, machine, next)
  if (source === 'Empty project') return emptyPage(ctx, machine, next)
  return folderPage(ctx, machine, next)
}

const sourceItem = (ctx: ProjectsContext, source: Source, icon: IconName, search: string): PaletteItem => ({
  id: `source:${source}`,
  icon,
  label: source,
  search,
  page: () => wherePage(ctx, machine => sourcePage(ctx, source, machine)),
})

export const sourcesPage = (ctx: ProjectsContext): PalettePage => ({
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
