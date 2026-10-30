import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import type { ProjectsContext } from '../context'
import { reviewPage } from './review'
import type { Choice } from './types'

const copyItem = (ctx: ProjectsContext, choice: Choice, group: ProjectGroup): PaletteItem => {
  const here = group.locations.find(location => location.device === choice.pc.id)
  return {
    id: `match:${group.id}`,
    icon: 'link',
    label: `Add as a copy of ${group.name}`,
    detail: here ? `Replaces the copy at ${here.path} on ${choice.pc.name}` : group.remote,
    search: `copy link ${group.name}`,
    page: () => reviewPage(ctx, { ...choice, project: group.id }),
  }
}

const matchPage = (ctx: ProjectsContext, choice: Choice, groups: ProjectGroup[]): PalettePage => ({
  id: 'match',
  title: `Same git remote as ${groups.length === 1 ? groups[0]!.name : `${groups.length} projects`}`,
  placeholder: 'Search…',
  empty: 'No matching choices.',
  items: () => [
    ...groups.map(group => copyItem(ctx, choice, group)),
    { id: 'match:new', icon: 'folder-plus', label: 'Keep it as a new project', search: 'new separate', page: () => reviewPage(ctx, choice) },
  ],
})

export const suggestPage = async (ctx: ProjectsContext, choice: Choice): Promise<PalettePage> => {
  if (choice.how !== 'add') return reviewPage(ctx, choice)
  const folder = await ctx.projects.inspect(choice.path, choice.pc.id).catch(() => undefined)
  if (folder?.project) return reviewPage(ctx, { ...choice, existing: folder.project })
  if (folder?.restores) return reviewPage(ctx, { ...choice, project: folder.restores })
  const groups = folder?.matches.flatMap(id => ctx.projects.get(id) ?? []) ?? []
  return groups.length ? matchPage(ctx, choice, groups) : reviewPage(ctx, choice)
}
