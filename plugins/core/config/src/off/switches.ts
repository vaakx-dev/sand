import type { ScopeView } from 'drydock'
import type { PluginOff, PluginSwitches } from '../contract'

interface Plugin {
  id: string
  dir: string
}

interface Loaded extends Plugin {
  scope: ScopeView
}

export const createSwitches = (turnedOff: () => Plugin[]) => {
  const loaded = new Map<string, Loaded>()
  let owners = new Map<string, string>()

  const rootsOfOwner = (owner: string, offIds: ReadonlySet<string>, seen: ReadonlySet<string>): string[] | undefined => {
    if (offIds.has(owner)) return [owner]
    const scope = loaded.get(owner)?.scope
    if (!scope || scope.status !== 'pending' || seen.has(owner)) return undefined
    return rootsOf(scope.missing(), offIds, new Set([...seen, owner]))
  }

  const rootsOf = (missing: string[], offIds: ReadonlySet<string>, seen: ReadonlySet<string>): string[] | undefined => {
    const roots = new Set<string>()
    for (const service of missing) {
      const owner = owners.get(service)
      const found = owner === undefined ? undefined : rootsOfOwner(owner, offIds, seen)
      if (!found) return undefined
      for (const root of found) roots.add(root)
    }
    return roots.size ? [...roots] : undefined
  }

  const needs = (missing: string[]) => rootsOf(missing, new Set(turnedOff().map(plugin => plugin.id)), new Set())

  const waitingOff = ({ id, dir, scope }: Loaded): PluginOff[] => {
    const found = scope.status === 'pending' ? needs(scope.missing()) : undefined
    return found ? [{ id, dir, needs: found }] : []
  }

  const switches: PluginSwitches = {
    turnedOff: dir => turnedOff().some(plugin => plugin.dir === dir),
    needs,
    off: () => [...turnedOff().map(plugin => ({ ...plugin, needs: [] })), ...[...loaded.values()].flatMap(waitingOff)],
    folder: scope => [...loaded.values()].find(plugin => plugin.scope.id === scope.id)?.dir,
  }

  return {
    switches,
    track: (plugin: Loaded) => void loaded.set(plugin.id, plugin),
    untrack: (id: string) => void loaded.delete(id),
    learnOwners: (found: Map<string, string>) => {
      owners = found
    },
  }
}
