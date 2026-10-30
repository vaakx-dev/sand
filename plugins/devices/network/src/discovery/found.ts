import type { DiscoveredPc, DiscoverySource, PcIdentity } from '@sand/devices-contract'

export interface Found {
  identity: PcIdentity
  url: string
  via: DiscoverySource
  seen: number
}

const rank: Record<DiscoverySource, number> = { lan: 0, tailscale: 1 }

export const mergeFound = (found: Found[], own: string, paired: (id: string) => boolean): DiscoveredPc[] => {
  const best = new Map<string, Found>()
  for (const entry of found) {
    if (entry.identity.id === own) continue
    const known = best.get(entry.identity.id)
    if (!known || rank[entry.via] < rank[known.via]) best.set(entry.identity.id, entry)
  }
  return [...best.values()]
    .map(({ identity, url, via }) => ({ id: identity.id, name: identity.name, platform: identity.platform, url, via, paired: paired(identity.id) }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
