import type { WaitReason } from '@sand/turns-contract/contract'
import type { TurnStore } from '../store/turns'

export const createWaiting = (store: TurnStore, turn: string, changed: () => void) => {
  const reasons: WaitReason[] = []
  const write = () => {
    store.wait(turn, reasons.at(-1))
    changed()
  }
  return (reason: WaitReason) => {
    reasons.push(reason)
    write()
    return () => {
      const index = reasons.indexOf(reason)
      if (index < 0) return
      reasons.splice(index, 1)
      write()
    }
  }
}
