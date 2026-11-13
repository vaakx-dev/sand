import type { LLM } from '@sand/accounts/contract'
import type { Sessions } from '@sand/chats/contract'
import { grouped } from '@sand/util'
import type { ThreadAccount, ThreadModel, ThreadUsage } from '../contract'
import { isBilled } from '../contract/billed'
import { limitsOf } from '../limits'
import { byCost, emptyTotals } from '../records'
import { type AccountId, identityResolver } from './identity'
import { modelLabels, nameOf } from './models'
import { addUsage } from './totals'
import { turnsOf } from './turns'

export interface ThreadSources {
  sessions: Sessions
  llm?: LLM
}

type Tally = ThreadModel & { helpers: Set<string> }

const familyOf = (sessions: Sessions, root: string) => {
  const family = [root]
  for (let index = 0; index < family.length; index++) family.push(...sessions.children(family[index] ?? '').map(child => child.id))
  return family
}

const accountOf = (id: AccountId, llm?: LLM): ThreadAccount => {
  const limits = limitsOf(llm).find(found => found.source === id.source && found.pc === id.pc)
  return { label: id.label, ...(id.pcName && { pcName: id.pcName }), ...(limits && { limits }) }
}

export const threadUsage = ({ sessions, llm }: ThreadSources, session: string): ThreadUsage => {
  const identify = identityResolver(llm)
  const labelOf = modelLabels(llm)
  const entries = familyOf(sessions, session).flatMap(id => sessions.entriesIn(id, 'usage'))
  const turns = turnsOf(entries).toSorted((first, second) => first.at - second.at)
  const total = emptyTotals()
  const models = new Map<string, Tally>()
  for (const turn of turns) {
    const id = identify(turn)
    const name = nameOf(turn.model)
    const price = llm?.price?.(turn.model)
    const model = grouped(models, name, (): Tally => ({ ...emptyTotals(), name, label: labelOf(turn.model), provider: id.provider, subagents: 0, helpers: new Set() }))
    if (turn.session !== session) model.helpers.add(turn.session)
    for (const totals of [total, model]) addUsage(totals, turn.usage, price, isBilled(id.billing))
  }
  const last = turns.at(-1)
  return {
    session,
    total,
    models: [...models.values()].map(({ helpers, ...model }) => ({ ...model, subagents: helpers.size })).sort(byCost),
    ...(last && { account: accountOf(identify(last), llm) }),
  }
}
