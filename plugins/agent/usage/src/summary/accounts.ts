import type { LLM, Limits } from '@sand/accounts/contract'
import type { AccountUsage } from '../contract'
import type { AccountId, Known } from './identity'
import { grouped } from '@sand/util'
import { limitsOf } from '../limits'
import { accountKey, byCost, emptyTotals } from '../records'
import { factsOf } from './labels'

const tallyOf = (id: AccountId): AccountUsage => ({ ...emptyTotals(), ...id })

const limitsOwner = (limits: Limits, known: Known): AccountId => {
  const { source, pc, pcName } = limits
  const key = accountKey({ source, pc })
  return known.get(key) ?? { key, source, ...factsOf(source), ...(pc && { pc }), ...(pcName && { pcName }) }
}

export const accountBook = (known: Known, llm?: LLM) => {
  const tallies = new Map<string, AccountUsage>()
  for (const id of known.values()) if (id.billing !== 'local') tallies.set(id.key, tallyOf(id))

  const add = (id: AccountId) => grouped(tallies, id.key, () => tallyOf(id))

  const finish = (): AccountUsage[] => {
    for (const limits of limitsOf(llm)) {
      const owner = limitsOwner(limits, known)
      grouped(tallies, owner.key, () => tallyOf(owner)).limits = limits
    }
    return [...tallies.values()].sort(byCost)
  }

  return { add, finish }
}
