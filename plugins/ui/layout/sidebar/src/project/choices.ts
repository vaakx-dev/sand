import type { ProjectLook } from '@sand/project/contract'
import { projects } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import type { ThreadItem } from '../items/item'

export interface ProjectChoice {
  key: string
  name: string
  icon?: ProjectLook
  count: number
}

const itemChoices = (items: ThreadItem[]) => {
  const found = new Map<string, ProjectChoice>()
  for (const item of items) {
    const choice = found.get(item.projectKey) ?? { key: item.projectKey, name: item.project, icon: item.icon, count: 0 }
    choice.count += 1
    choice.icon ??= item.icon
    found.set(item.projectKey, choice)
  }
  return found
}

const groupChoices = (ctx: Context) => {
  const found = ctx.get(projects)
  if (!found) return []
  return found.groups().map((group): ProjectChoice => ({ key: group.id, name: group.name, icon: found.groupIcon(group), count: 0 }))
}

export const projectChoices = (ctx: Context, items: ThreadItem[]): ProjectChoice[] => {
  const found = itemChoices(items)
  const hidden = ctx
    .get(projects)
    ?.groups({ hidden: true })
    .filter(group => group.hidden)
    .map(group => group.id)
  for (const key of hidden ?? []) found.delete(key)
  for (const choice of groupChoices(ctx)) {
    const known = found.get(choice.key)
    if (known) known.icon ??= choice.icon
    else found.set(choice.key, choice)
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const choiceName = (choices: ProjectChoice[], key: string) => choices.find(found => found.key === key)?.name ?? key
