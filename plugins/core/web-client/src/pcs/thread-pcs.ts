import type { ThreadPcs } from '@sand/devices-contract'
import type { Store } from '../threads/store'

export const threadPcsOf = (store: Store): ThreadPcs => ({
  ofSession: session => store.threads.get(session)?.device,
  current: () => store.device(),
  since: pc => store.synced.get(pc),
})
