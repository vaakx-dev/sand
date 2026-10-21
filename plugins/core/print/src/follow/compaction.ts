import type { ContextUsage } from '@sand/compaction/contract'
import { tokens } from '@sand/util'

export const createCompactionLines = () => {
  let started: number | undefined

  return {
    change(usage: ContextUsage) {
      if (usage.compacting && started === undefined) {
        started = usage.used
        return `◌ compacting context at ${tokens(usage.used)} tokens`
      }
      if (usage.compacting || started === undefined) return undefined
      const before = started
      started = undefined
      return before === usage.used ? '◌ context was not compacted' : `◌ compacted context: ${tokens(before)} → ${tokens(usage.used)} tokens`
    },
  }
}
