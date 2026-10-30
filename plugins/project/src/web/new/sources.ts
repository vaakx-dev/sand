import type { PcView } from '@sand/devices-contract'
import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { ProjectsContext } from '../context'
import { emptyPage } from './empty'
import { folderPage } from './folder'
import { suggestPage } from './match'
import type { Choice, Source } from './types'
import { wherePage } from './where'

const sourcePage = (ctx: ProjectsContext, source: Source, pc: PcView): PalettePage => {
  const next = (choice: Choice) => suggestPage(ctx, choice)
  if (source === 'Empty project') return emptyPage(ctx, pc, next)
  return folderPage(ctx, pc, next)
}

const sourceItem = (ctx: ProjectsContext, source: Source, icon: IconName, search: string): PaletteItem => ({
  id: `source:${source}`,
  icon,
  label: source,
  search,
  page: () => wherePage(ctx, pc => sourcePage(ctx, source, pc)),
})

export const sourcesPage = (ctx: ProjectsContext): PalettePage => ({
  id: 'sources',
  title: 'Source',
  placeholder: 'Search…',
  empty: 'No matching sources.',
  items: () => [sourceItem(ctx, 'Local folder', 'folder-plus', 'local folder directory browse'), sourceItem(ctx, 'Empty project', 'folder', 'new empty create')],
})
