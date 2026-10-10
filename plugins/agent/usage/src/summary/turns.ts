import type { UsageRecord } from '@sand/loops/contract'
import type { Entry } from '@sand/messages'

export interface Turn extends Omit<UsageRecord, 'id' | 'model'> {
  at: number
  session: string
  model: string
}

const copyFinder = (isBranch: (session: string) => boolean) => {
  const ids = new Set<string>()
  const contents = new Set<string>()
  return (entry: Entry, record: UsageRecord) => {
    if (record.id) {
      const copied = ids.has(record.id)
      ids.add(record.id)
      return copied
    }
    const content = JSON.stringify(record)
    const copied = isBranch(entry.session) && contents.has(content)
    contents.add(content)
    return copied
  }
}

const turnOf = (entry: Entry, { id: _, model, ...tags }: UsageRecord): Turn => ({
  ...tags,
  at: entry.at,
  session: entry.session,
  model: model ?? 'unknown',
})

export const turnsOf = (entries: Entry[], isBranch: (session: string) => boolean): Turn[] => {
  const isCopy = copyFinder(isBranch)
  return entries.flatMap(entry => {
    const record = entry.data as UsageRecord
    return isCopy(entry, record) ? [] : [turnOf(entry, record)]
  })
}
