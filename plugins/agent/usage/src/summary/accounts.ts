import type { LLM, Limits, SourceInfo } from '@sand/llm-accounts/contract'
import type { AccountUsage } from '../contract'
import type { AccountId } from './identity'
import { accountKey } from '@sand/kit'
import { limitsOf } from '../limits'
import { grouped } from './grouped'
import { factsOf } from './labels'
import { byCost, emptyTotals } from './totals'

type Tally = AccountUsage & { roots: Set<string> }

const tallyOf = (id: AccountId): Tally => ({ ...emptyTotals(), ...id, threads: 0, roots: new Set<string>() })

const seedOf = ({ id, label, provider, billing, plan }: SourceInfo): AccountId => ({
  key: id,
  source: id,
  label,
  provider,
  billing,
  ...(plan && { plan }),
})

const limitsOwner = (limits: Limits, seeds: Map<string, AccountId>): AccountId => {
  const source = limits.source ?? 'claude'
  const key = accountKey({ source, pc: limits.pc })
  const seed = limits.pc ? undefined : seeds.get(key)
  const facts = factsOf(source)
  return seed ?? { key, source, ...facts, ...(limits.pc && { pc: limits.pc }), ...(limits.pcName && { pcName: limits.pcName }) }
}

const ownSources = (llm?: LLM) => (llm?.sources?.() ?? []).filter(source => !source.via && source.billing !== 'local')

export const accountBook = (llm?: LLM) => {
  const tallies = new Map<string, Tally>()
  const seeds = new Map(ownSources(llm).map(source => [source.id, seedOf(source)]))
  for (const seed of seeds.values()) tallies.set(seed.key, tallyOf(seed))

  const add = (id: AccountId, root: string) => {
    const tally = grouped(tallies, id.key, () => tallyOf(id))
    tally.roots.add(root)
    return tally
  }

  const finish = (): AccountUsage[] => {
    for (const limits of limitsOf(llm)) {
      const owner = limitsOwner(limits, seeds)
      grouped(tallies, owner.key, () => tallyOf(owner)).limits = limits
    }
    return [...tallies.values()].sort(byCost).map(({ roots, ...account }) => ({ ...account, threads: roots.size }))
  }

  return { add, finish }
}
