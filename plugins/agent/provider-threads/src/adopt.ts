import type { Usage, UsageRecord } from '@sand/accounts/contract'
import { modelSource, type Selection } from '@sand/model/contract'
import type { NewThread } from './store/threads'
import { covered, fullBasis } from './view/basis'
import type { Path } from './view/path'

export const contextOf = (usage: Usage) => usage.input + usage.cacheRead + usage.cacheWrite

export type Adoption = Omit<NewThread, 'conversation' | 'system'> & { system?: string }

export const adoption = (path: Path, target: Selection): Adoption => {
  const usage = path.entries.findLast(entry => entry.type === 'usage')
  const record = usage?.data as UsageRecord | undefined
  const model = record?.model ?? target.model
  const system = path.entries.find(entry => entry.type === 'system')?.data
  return {
    selection: { ...target, source: modelSource(model), model },
    ...(typeof system === 'string' && { system }),
    seen: covered(fullBasis(path), path),
    context: record ? contextOf(record.usage) : 0,
    used: usage?.at ?? 0,
  }
}
