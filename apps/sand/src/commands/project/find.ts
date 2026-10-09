import { resolve } from 'node:path'
import { describeGroup, type Group } from './groups'

export const findGroup = (groups: Group[], value: string): Group => {
  const byId = groups.find(group => group.id === value)
  if (byId) return byId
  const name = value.toLowerCase()
  const paths = new Set([value, resolve(value)])
  const matches = groups.filter(group => group.name.toLowerCase() === name || group.locations.some(location => paths.has(location.path)))
  if (!matches.length) throw new Error(`no project "${value}"; sand project lists them`)
  if (matches.length > 1) throw new Error(`"${value}" matches several projects, use a path or id:\n${matches.map(group => `  ${group.id}  ${describeGroup(group)}`).join('\n')}`)
  return matches[0]!
}
