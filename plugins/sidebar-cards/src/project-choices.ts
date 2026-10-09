import type { NavList } from '@sand/protocol'
import { folderName } from '@sand/kit'
import type { Context } from 'drydock'

export interface ProjectChoice {
  key: string
  name: string
  icon?: string
  count: number
  folders: string[]
}

export const inProject = (item: { project?: string; projectKey?: string }, key: string) => item.projectKey === key || item.project === key

const itemChoices = (lists: NavList[]) => {
  const found = new Map<string, ProjectChoice>()
  for (const item of lists.flatMap(list => list.items())) {
    const key = item.projectKey ?? item.project
    if (!key) continue
    const choice = found.get(key) ?? { key, name: item.project ?? key, icon: item.icon, count: 0, folders: [] }
    choice.count += 1
    choice.icon ??= item.icon
    if (item.path) choice.folders.push(item.path)
    found.set(key, choice)
  }
  return found
}

const groupChoices = (ctx: Context) => {
  const projects = ctx.projects
  if (!projects) return []
  return projects.groups().map(
    (group): ProjectChoice => ({
      key: group.id,
      name: group.name,
      icon: group.locations.map(location => projects.icon(location.path, location.device)).find(Boolean),
      count: 0,
      folders: group.locations.map(location => location.path),
    }),
  )
}

export const projectChoices = (ctx: Context, lists: NavList[]): ProjectChoice[] => {
  const found = itemChoices(lists)
  const hidden = new Set(ctx.projects?.groups({ hidden: true }).filter(group => group.hidden).map(group => group.id))
  for (const key of hidden) found.delete(key)
  for (const choice of groupChoices(ctx)) {
    const known = found.get(choice.key)
    if (known) {
      known.icon ??= choice.icon
      known.folders.push(...choice.folders)
    } else found.set(choice.key, choice)
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const choiceName = (choices: ProjectChoice[], key: string) => {
  const choice = choices.find(found => found.key === key)
  if (choice) return choice.name
  const at = key.indexOf('\0')
  return at >= 0 ? folderName(key.slice(at + 1)) : key
}

export const migratedKey = (choices: ProjectChoice[], stored: string) => {
  if (!stored || choices.some(choice => choice.key === stored)) return stored
  const path = stored.slice(stored.indexOf('\0') + 1)
  const holds = (choice: ProjectChoice) =>
    stored.includes('\0') ? choice.folders.includes(path) : choice.name === stored || choice.folders.some(folder => folderName(folder) === stored)
  const matches = choices.filter(holds)
  return matches.sort((a, b) => b.count - a.count)[0]?.key ?? stored
}
