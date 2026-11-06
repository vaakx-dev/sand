import type { WaitReason } from '../contract'
import type { TurnStore } from '../store/turns'

export const createWaiting = (store: TurnStore, turn: string, holder: string, changed: () => void) => {
  const reasons: WaitReason[] = []
  const write = () => {
    store.wait(turn, holder, reasons)
    changed()
  }
  return {
    wait(reason: WaitReason) {
      reasons.push(reason)
      write()
      return () => {
        const index = reasons.indexOf(reason)
        if (index < 0) return
        reasons.splice(index, 1)
        write()
      }
    },
    durable: (calls: Set<string>) =>
      calls.size > 0 && reasons.every(reason => reason.durable) && [...calls].every(call => reasons.some(reason => reason.call === call)),
  }
}
