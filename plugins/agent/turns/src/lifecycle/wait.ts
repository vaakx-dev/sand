import { type TurnInfo, turnChange, type WaitUntil } from '@sand/turns-contract/contract'
import type { TurnsContext } from '../context'
import type { TurnStore } from '../store/turns'

const pollEvery = 1_000

const reached = (info: TurnInfo, until: WaitUntil) => info.ended !== undefined || (until === 'attention' && info.status === 'waiting')

export const createWait = (ctx: TurnsContext, store: TurnStore) => async (turn: string, until: WaitUntil, signal?: AbortSignal) => {
  if (!store.get(turn)) throw new Error(`No turn ${turn}`)
  return new Promise<TurnInfo>(resolve => {
    const check = () => {
      const info = store.get(turn)!
      if (!reached(info, until) && !signal?.aborted) return
      stop()
      resolve(info)
    }
    const stopChanges = ctx.on(turnChange, info => void (info.id === turn && check()))
    const timer = setInterval(check, pollEvery)
    const stop = () => {
      stopChanges()
      clearInterval(timer)
      signal?.removeEventListener('abort', check)
    }
    signal?.addEventListener('abort', check)
    check()
  })
}
