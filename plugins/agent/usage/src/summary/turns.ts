import type { UsageRecord } from '@sand/accounts/contract'
import type { Entry } from '@sand/chats/contract'
import { sumUsage } from '../records'

export interface Turn extends Omit<UsageRecord, 'id' | 'model'> {
  at: number
  session: string
  model: string
}

const turnOf = (entry: Entry, { id: _, model, ...tags }: UsageRecord): Turn => ({
  ...tags,
  at: entry.at,
  session: entry.session,
  model: model ?? 'unknown',
})

const keyOf = (entry: Entry, { id, model, source, pc }: UsageRecord) => [entry.turn ?? id, model, source, pc].join('\n')

export const turnsOf = (entries: Entry[]): Turn[] => {
  const seen = new Set<string>()
  const turns = new Map<string, Turn>()
  for (const entry of entries) {
    const record = entry.data as UsageRecord
    if (seen.has(record.id)) continue
    seen.add(record.id)
    const key = keyOf(entry, record)
    const found = turns.get(key)
    if (found) found.usage = sumUsage(found.usage, record.usage)
    else turns.set(key, turnOf(entry, record))
  }
  return [...turns.values()]
}
