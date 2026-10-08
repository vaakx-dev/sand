import { resolve } from 'node:path'
import { describeGroup, type Group } from './groups'

export const findGroup = (groups: Group[], value: string): Group => {
  const name = value.toLowerCase()
  const paths = new Set([value, resolve(value)])
  const matches = groups.filter(group => group.name.toLowerCase() === name || group.locations.some(location => paths.has(location.project.path)))
  if (!matches.length) throw new Error(`no project "${value}"; sand project lists them`)
  if (matches.length > 1) throw new Error(`"${value}" matches several projects, use a path:\n${matches.map(group => `  ${describeGroup(group)}`).join('\n')}`)
  return matches[0]!
}
