import type { LLM, Limits, SourceInfo } from '@sand/accounts/contract'
import type { AccountUsage } from '../contract'
import type { AccountId } from './identity'
import { grouped } from '@sand/util'
import { limitsOf } from '../limits'
import { accountKey, byCost, emptyTotals } from '../records'
import { factsOf } from './labels'

const tallyOf = (id: AccountId): AccountUsage => ({ ...emptyTotals(), ...id })

const seedOf = ({ id, label, provider, billing, plan }: SourceInfo): AccountId => ({
  key: id,
  source: id,
  label,
  provider,
  billing,
  ...(plan && { plan }),
})

const limitsOwner = (limits: Limits, seeds: Map<string, AccountId>): AccountId => {
  const { source } = limits
  const key = accountKey({ source, pc: limits.pc })
  const seed = limits.pc ? undefined : seeds.get(key)
  const facts = factsOf(source)
  return seed ?? { key, source, ...facts, ...(limits.pc && { pc: limits.pc }), ...(limits.pcName && { pcName: limits.pcName }) }
}

const ownSources = (llm?: LLM) => (llm?.sources?.() ?? []).filter(source => !source.via && source.billing !== 'local')

export const accountBook = (llm?: LLM) => {
  const tallies = new Map<string, AccountUsage>()
  const seeds = new Map(ownSources(llm).map(source => [source.id, seedOf(source)]))
  for (const seed of seeds.values()) tallies.set(seed.key, tallyOf(seed))

  const add = (id: AccountId) => grouped(tallies, id.key, () => tallyOf(id))

  const finish = (): AccountUsage[] => {
    for (const limits of limitsOf(llm)) {
      const owner = limitsOwner(limits, seeds)
      grouped(tallies, owner.key, () => tallyOf(owner)).limits = limits
    }
    return [...tallies.values()].sort(byCost)
  }

  return { add, finish }
}
