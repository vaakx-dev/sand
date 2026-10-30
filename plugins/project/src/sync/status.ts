import type { PeerView } from '@sand/devices-contract'
import type { Outcome } from './exchange'

export const createStatus = () => {
  const states = new Map<string, Outcome['state']>()
  return (pc: PeerView, outcome: Outcome) => {
    const previous = states.get(pc.id)
    if (previous === outcome.state) return
    states.set(pc.id, outcome.state)
    if (outcome.state === 'failed') console.error(`project sync: ${pc.name} could not sync projects: ${outcome.detail}`)
    else if (outcome.state !== 'ok') console.error(`project sync: ${outcome.detail}`)
    else if (previous) console.error(`project sync: ${pc.name} is back in sync`)
  }
}
