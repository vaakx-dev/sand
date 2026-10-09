import type { PaletteItem, PalettePage, ProjectGroup } from '@sand/protocol'
import { remoteKey } from '@sand/kit'
import { reviewPage } from './review'
import { deviceOf, type Choice, type FlowContext } from './types'

const copyItem = (ctx: FlowContext, choice: Choice, group: ProjectGroup): PaletteItem => {
  const here = group.locations.find(location => location.device === deviceOf(choice.machine))
  return {
    id: `match:${group.id}`,
    icon: 'link',
    label: `Add as a copy of ${group.name}`,
    detail: here ? `Replaces the copy at ${here.path} on ${choice.machine.name}` : group.remote,
    search: `copy link ${group.name}`,
    page: () => reviewPage(ctx, { ...choice, project: group.id }),
  }
}

const matchPage = (ctx: FlowContext, choice: Choice, groups: ProjectGroup[]): PalettePage => ({
  id: 'match',
  title: `Same git remote as ${groups.length === 1 ? groups[0]!.name : `${groups.length} projects`}`,
  placeholder: 'Search…',
  empty: 'No matching choices.',
  items: () => [
    ...groups.map(group => copyItem(ctx, choice, group)),
    { id: 'match:new', icon: 'folder-plus', label: 'Keep it as a new project', search: 'new separate', page: () => reviewPage(ctx, choice) },
  ],
})

const sameRemote = (ctx: FlowContext, url: string) => {
  const key = remoteKey(url)
  return key ? ctx.projects.groups({ hidden: true }).filter(group => group.remote && remoteKey(group.remote) === key) : []
}

const inspected = async (ctx: FlowContext, choice: Choice): Promise<{ choice: Choice; groups: ProjectGroup[] }> => {
  const folder = await ctx.projects.inspect(choice.path, deviceOf(choice.machine)).catch(() => undefined)
  if (!folder) return { choice, groups: [] }
  if (folder.project) return { choice: { ...choice, existing: folder.project }, groups: [] }
  const groups = folder.matches.map(id => ctx.projects.get(id)).filter((group): group is ProjectGroup => Boolean(group))
  return { choice, groups }
}

export const suggestPage = async (ctx: FlowContext, choice: Choice): Promise<PalettePage> => {
  if (choice.project) return reviewPage(ctx, choice)
  if (choice.how === 'clone' && choice.repo) {
    const groups = sameRemote(ctx, choice.repo.url)
    return groups.length ? matchPage(ctx, choice, groups) : reviewPage(ctx, choice)
  }
  if (choice.how !== 'add') return reviewPage(ctx, choice)
  const found = await inspected(ctx, choice)
  return found.groups.length ? matchPage(ctx, found.choice, found.groups) : reviewPage(ctx, found.choice)
}
