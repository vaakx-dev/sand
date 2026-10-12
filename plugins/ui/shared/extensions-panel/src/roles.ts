import type { ExtensionInfo } from '@sand/web/contract'
import type { Pulse } from '@sand/kit/web'
import { grouped } from '@sand/kit'
import type { Context } from 'drydock'

export interface Roles {
  provider(role: string): string | undefined
  shadowed(role: string): string[]
  provides(extension: ExtensionInfo): string[]
  all(): string[]
  swaps(): { role: string; candidates: ExtensionInfo[] }[]
}

const self = 'extensions-panel'

const readRoles = (ctx: Context, extensions: ExtensionInfo[], seen: Map<string, Set<string>>): Roles => {
  const idOf = (name: string) => extensions.find(extension => extension.name === name)?.id ?? name
  const services = (ctx.inspector?.services() ?? []).filter(service => service.key !== 'inspector')
  const stacks = new Map<string, string[]>()
  for (const service of services) {
    const id = idOf(service.provider)
    grouped(stacks, service.key, (): string[] => []).push(id)
    if (service.active) grouped(seen, id, () => new Set<string>()).add(service.key)
  }
  const active = new Map(services.filter(service => service.active).map(service => [service.key, idOf(service.provider)]))
  const provides = (extension: ExtensionInfo) => [...new Set([...extension.provides, ...(seen.get(extension.id) ?? [])])].sort()
  return {
    provider: role => active.get(role),
    shadowed: role => (stacks.get(role) ?? []).filter(id => id !== active.get(role)),
    provides,
    all: () => [...active.keys()].sort(),
    swaps: () =>
      [...new Set(extensions.flatMap(provides))]
        .sort()
        .map(role => ({ role, candidates: extensions.filter(extension => provides(extension).includes(role)) }))
        .filter(group => group.candidates.length > 1),
  }
}

export const lockedIds = (extensions: ExtensionInfo[], roles: Roles) => {
  const locked = new Set([self])
  for (const role of extensions.find(extension => extension.id === self)?.inject ?? []) {
    const providers = extensions.filter(extension => extension.configured && roles.provides(extension).includes(role))
    if (providers.length === 1) locked.add(providers[0]!.id)
  }
  return locked
}

export const interfaceState = (ctx: Context<'extensions'>, changes: Pulse) => {
  const seen = new Map<string, Set<string>>()
  return changes.read(() => {
    const extensions = ctx.extensions.list()
    return { extensions, roles: readRoles(ctx, extensions, seen) }
  })
}

export type InterfaceState = ReturnType<typeof interfaceState>
