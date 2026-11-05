import type { UsageRecord } from '@sand/accounts/contract'
import type { Entry } from '@sand/chats/contract'
import type { Path } from './path'

export type TurnModel = (turn: string) => string | undefined

export type Producers = Map<string, string>

const modelOf = (entry: Entry, recorded: string | undefined, turnModel: TurnModel) => {
  if (entry.turn) return turnModel(entry.turn)
  return entry.type === 'message' ? recorded : undefined
}

export const producers = (path: Path, turnModel: TurnModel): Producers => {
  const found: Producers = new Map()
  let recorded: string | undefined
  for (let at = path.entries.length - 1; at >= 0; at--) {
    const entry = path.entries[at]!
    if (entry.type === 'usage') {
      recorded = (entry.data as UsageRecord).model
      continue
    }
    const model = modelOf(entry, recorded, turnModel)
    if (model) found.set(entry.id, model)
    recorded = undefined
  }
  return found
}
