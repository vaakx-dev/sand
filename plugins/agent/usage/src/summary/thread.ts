import type { LLM } from '@sand/accounts/contract'
import type { Sessions } from '@sand/chats/contract'
import { grouped } from '@sand/util'
import type { ThreadModel, ThreadUsage } from '../contract'
import { isBilled } from '../contract/billed'
import { addTotals, byCost, emptyTotals } from '../records'
import { identityResolver } from './identity'
import { modelLabels, nameOf } from './models'
import { addUsage } from './totals'
import { turnsOf } from './turns'

export interface ThreadSources {
  sessions: Sessions
  llm?: LLM
}

type Tally = ThreadModel & { helpers: Set<string> }

export const threadFamily = (sessions: Sessions, root: string) => {
  const family = [root]
  for (let index = 0; index < family.length; index++) family.push(...sessions.children(family[index] ?? '').map(child => child.id))
  return family
}

const addModel = (models: Map<string, ThreadModel>, model: ThreadModel) => {
  const found = models.get(model.name)
  models.set(model.name, found ? { ...addTotals({ ...found }, model), subagents: found.subagents + model.subagents } : model)
  return models
}

export const joinThreadUsage = (usage: ThreadUsage, others: ThreadUsage[]): ThreadUsage => ({
  session: usage.session,
  total: others.reduce((total, other) => addTotals(total, other.total), { ...usage.total }),
  models: [
    ...others
      .flatMap(other => other.models)
      .reduce(addModel, new Map(usage.models.map(model => [model.name, model])))
      .values(),
  ].sort(byCost),
})

export const threadUsage = ({ sessions, llm }: ThreadSources, session: string, root = session): ThreadUsage => {
  const identify = identityResolver(llm)
  const labelOf = modelLabels(llm)
  const entries = threadFamily(sessions, session).flatMap(id => sessions.entriesIn(id, 'usage'))
  const turns = turnsOf(entries)
  const total = emptyTotals()
  const models = new Map<string, Tally>()
  for (const turn of turns) {
    const id = identify(turn)
    const name = nameOf(turn.model)
    const price = llm?.price?.(turn.model)
    const model = grouped(models, name, (): Tally => ({ ...emptyTotals(), name, label: labelOf(turn.model), provider: id.provider, subagents: 0, helpers: new Set() }))
    if (turn.session !== root) model.helpers.add(turn.session)
    for (const totals of [total, model]) addUsage(totals, turn.usage, price, isBilled(id.billing))
  }
  return {
    session,
    total,
    models: [...models.values()].map(({ helpers, ...model }) => ({ ...model, subagents: helpers.size })).sort(byCost),
  }
}
