import type { Tool } from '../contract'
import { findName } from './find'

const locationOf = (frame: string) => /\(?([^()]+:\d+:\d+)\)?$/.exec(frame.trim().replace(/^at /, ''))?.[1]

const isCaller = (location: string | undefined) =>
  location !== undefined && /[\\/]/.test(location) && !location.startsWith(import.meta.dir) && !location.includes('node_modules')

export const callerSite = () => new Error().stack?.split('\n').map(locationOf).find(isCaller) ?? 'an unknown caller'

const replaces = (tool: Tool, name: string) => tool.replaces?.includes(name) === true

export const checkName = (tool: Tool, site: string, registered: Map<Tool, string>) => {
  if (tool.name === findName) throw new Error(`Tool "${findName}" from ${site} takes the name of the built-in tool search`)
  if (replaces(tool, tool.name)) return
  const other = [...registered].find(([existing]) => existing.name === tool.name && !replaces(existing, tool.name))
  if (other)
    throw new Error(`Tool "${tool.name}" from ${site} clashes with the one from ${other[1]}; rename one, or list "${tool.name}" in the replaces of the one that should win`)
}
