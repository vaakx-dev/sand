import type { PullArrangement, PullLink, PullLine } from '../contract'
import { type Chain, pullChains } from './chains'
import { primaryOf, touched } from './primary'

const latest = (chain: Chain) => Math.max(...chain.layers.map(touched))

const linesOf = (chains: Chain[]): PullLine[] =>
  [...chains].sort((a, b) => latest(b) - latest(a)).flatMap(chain => chain.layers.map((link, index) => ({ link, depth: chain.depths[index] ?? 0 })))

export const arrangePulls = (links: PullLink[]): PullArrangement => {
  const chains = pullChains(links)
  return { lines: linesOf(chains), primary: primaryOf(links, chains), stack: links.length > 1 && chains.length === 1 }
}
