import type { ThreadPcs } from '@sand/devices-contract'
import type { Store } from '../threads/store'

export const threadPcsOf = (store: Store, restored: Promise<void>): ThreadPcs => ({
  ofSession: session => store.threads.get(session)?.device,
  current: () => store.device(),
  since: pc => store.synced.get(pc) ?? restored.then(() => store.synced.get(pc)),
})
