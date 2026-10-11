import { resolve } from 'node:path'
import { describeGroup, loadGroups, type Group } from './groups'
import type { Pcs } from './pcs'

export const findGroup = (groups: Group[], value: string): Group => {
  const byId = groups.find(group => group.id === value)
  if (byId) return byId
  const name = value.toLowerCase()
  const paths = new Set([value, resolve(value)])
  const matches = groups.filter(group => group.name.toLowerCase() === name || group.locations.some(location => paths.has(location.path)))
  const [match, ...others] = matches
  if (!match) throw new Error(`no project "${value}"; sand project lists them`)
  if (others.length) throw new Error(`"${value}" matches several projects, use a path or id:\n${matches.map(group => `  ${group.id}  ${describeGroup(group)}`).join('\n')}`)
  return match
}

export const loadGroup = async (pcs: Pcs, value: string) => {
  const loaded = await loadGroups(pcs)
  return { ...loaded, group: findGroup(loaded.groups, value) }
}
