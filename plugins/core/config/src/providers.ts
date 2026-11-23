import { builtinPlugins } from './find'
import { serviceOwners } from './off/owners'

interface Provider {
  id: string
  dir: string
}

const providersIn = async (builtins: string) => {
  const found = await builtinPlugins(builtins)
  const dirs = new Map(found.map(([id, dir]) => [id, dir]))
  const owners = await serviceOwners(found.map(([id, dir]) => [id, dir] as const))
  return new Map([...owners].map(([service, id]): [string, Provider] => [service, { id, dir: dirs.get(id)! }]))
}

export { providersIn, type Provider }
