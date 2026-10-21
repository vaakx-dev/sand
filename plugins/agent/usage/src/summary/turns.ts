import type { UsageRecord } from '@sand/accounts/contract'
import type { Entry } from '@sand/chats/contract'

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

export const turnsOf = (entries: Entry[]): Turn[] => {
  const seen = new Set<string>()
  return entries.flatMap(entry => {
    const record = entry.data as UsageRecord
    if (seen.has(record.id)) return []
    seen.add(record.id)
    return [turnOf(entry, record)]
  })
}
