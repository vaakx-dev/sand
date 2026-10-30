import { derive, sig } from '@vaakx-dev/vrui'
import type { SendHold } from '../contract'

export const createHolds = () => {
  const holds = sig<SendHold[]>([])
  const reason = derive(() => holds.get().map(hold => hold()).find(Boolean))
  return {
    reason,
    add(hold: SendHold) {
      holds.update(all => [...all, hold])
      return () => holds.update(all => all.filter(other => other !== hold))
    },
  }
}
