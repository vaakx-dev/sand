import { pullKey } from '@sand/github/contract'
import type { PullLink } from '../contract'

export interface Chain {
  layers: PullLink[]
  depths: number[]
}

const repoOf = (link: PullLink) => link.repo.toLowerCase()

const nativeChains = (links: PullLink[]): Chain[] => {
  const stacks = new Map<string, PullLink[]>()
  for (const link of links) {
    const stack = link.summary?.stack
    if (!stack) continue
    const key = `${repoOf(link)}#${stack.number}`
    stacks.set(key, [...(stacks.get(key) ?? []), link])
  }
  return [...stacks.values()].map(members => {
    const layers = members.sort((a, b) => (a.summary?.stack?.position ?? 0) - (b.summary?.stack?.position ?? 0))
    return { layers, depths: layers.map((_, index) => index) }
  })
}

const derivedChains = (links: PullLink[]): Chain[] => {
  const branchOf = (link: PullLink, branch: string) => `${repoOf(link)}:${branch}`
  const byHead = new Map<string, PullLink | null>()
  for (const link of links) {
    if (!link.summary) continue
    const key = branchOf(link, link.summary.head)
    byHead.set(key, byHead.has(key) ? null : link)
  }
  const parentOf = (link: PullLink) => {
    const parent = link.summary && byHead.get(branchOf(link, link.summary.base))
    return parent && parent !== link ? parent : undefined
  }
  const children = new Map<string, PullLink[]>()
  for (const link of links) {
    const parent = parentOf(link)
    if (parent) children.set(pullKey(parent), [...(children.get(pullKey(parent)) ?? []), link])
  }
  const placed = new Set<string>()
  const chains: Chain[] = []
  const walk = (link: PullLink, depth: number, chain: Chain) => {
    if (placed.has(pullKey(link))) return
    placed.add(pullKey(link))
    chain.layers.push(link)
    chain.depths.push(depth)
    for (const child of children.get(pullKey(link)) ?? []) walk(child, depth + 1, chain)
  }
  for (const base of links.filter(link => !parentOf(link))) {
    const chain: Chain = { layers: [], depths: [] }
    walk(base, 0, chain)
    if (chain.layers.length) chains.push(chain)
  }
  for (const link of links) if (!placed.has(pullKey(link))) chains.push({ layers: [link], depths: [0] })
  return chains
}

export const pullChains = (links: PullLink[]): Chain[] => {
  const native = nativeChains(links)
  const placed = new Set(native.flatMap(chain => chain.layers.map(pullKey)))
  return [...native, ...derivedChains(links.filter(link => !placed.has(pullKey(link))))]
}

export const fromTop = ({ layers, depths }: Chain) =>
  layers
    .map((link, index) => ({ link, index, depth: depths[index] ?? 0 }))
    .sort((a, b) => b.depth - a.depth || b.index - a.index)
    .map(entry => entry.link)
