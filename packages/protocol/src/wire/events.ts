import type { RuntimeChange } from '../runtime'

export interface BroadcastEvents {
  'runtime.changed': [change: RuntimeChange]
  'runtime.failed': [error: string]
}
