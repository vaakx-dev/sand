import type { ExtensionInfo } from '@sand/web/contract'
import type { Context } from 'drydock'

export interface Roles {
  provider(role: string): string | undefined
  shadowed(role: string): string[]
  provides(extension: ExtensionInfo): string[]
  all(): string[]
  swaps(list: ExtensionInfo[]): { role: string; candidates: ExtensionInfo[] }[]
}

export const readRoles = (ctx: Context, seen: Map<string, Set<string>>): Roles => {
  const extensions = ctx.extensions?.list() ?? []
  const idOf = (name: string) => extensions.find(extension => extension.name === name)?.id ?? name
  const services = (ctx.inspector?.services() ?? []).filter(service => service.key !== 'inspector')
  const stacks = new Map<string, string[]>()
  for (const service of services) {
    stacks.set(service.key, [...(stacks.get(service.key) ?? []), idOf(service.provider)])
    if (!service.active) continue
    const id = idOf(service.provider)
    seen.set(id, new Set([...(seen.get(id) ?? []), service.key]))
  }
  const active = new Map(services.filter(service => service.active).map(service => [service.key, idOf(service.provider)]))
  const provides = (extension: ExtensionInfo) => [...new Set([...extension.provides, ...(seen.get(extension.id) ?? [])])].sort()
  return {
    provider: role => active.get(role),
    shadowed: role => (stacks.get(role) ?? []).filter(id => id !== active.get(role)),
    provides,
    all: () => [...active.keys()].sort(),
    swaps: list =>
      [...new Set(list.flatMap(provides))]
        .sort()
        .map(role => ({ role, candidates: list.filter(extension => provides(extension).includes(role)) }))
        .filter(group => group.candidates.length > 1),
  }
}
