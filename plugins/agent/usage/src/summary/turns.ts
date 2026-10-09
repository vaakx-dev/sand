import type { Billing } from '@sand/llm-accounts/contract'
import type { UsageRecord } from '@sand/loops/contract'
import type { Entry, Usage } from '@sand/messages'

export interface Turn {
  at: number
  session: string
  model: string
  provider?: string
  billing?: Billing
  usage: Usage
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

export const turnsOf = (entries: Entry[], isBranch: (session: string) => boolean): Turn[] => {
  const isCopy = copyFinder(isBranch)
  return entries.flatMap(entry => {
    const record = entry.data as UsageRecord
    if (isCopy(entry, record)) return []
    return [
      {
        at: entry.at,
        session: entry.session,
        model: record.model ?? 'unknown',
        ...(record.provider && { provider: record.provider }),
        ...(record.billing && { billing: record.billing }),
        usage: record.usage,
      },
    ]
  })
}
