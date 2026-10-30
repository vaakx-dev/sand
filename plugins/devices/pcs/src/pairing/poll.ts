import type { JoinTicket } from '@sand/devices-contract'
import { after } from '../changes'
import { checkJoin, type JoinCheck } from './join'

const pollEvery = 2000
const grace = 5000

export type JoinSettled = Exclude<JoinCheck, { phase: 'pending' }>

export const pollJoin = (ticket: JoinTicket, settled: (outcome: JoinSettled) => void) => {
  let cancel: (() => void) | undefined
  let stopped = false

  const finish = (outcome: JoinSettled) => {
    stopped = true
    settled(outcome)
  }

  const tick = async () => {
    const check = await checkJoin(ticket.id).catch(() => undefined)
    if (stopped) return
    if (check && check.phase !== 'pending') return finish(check)
    if (Date.now() > ticket.expires + grace) return finish({ phase: 'expired' })
    cancel = after(pollEvery, () => void tick())
  }

  cancel = after(pollEvery, () => void tick())

  return () => {
    stopped = true
    cancel?.()
  }
}
