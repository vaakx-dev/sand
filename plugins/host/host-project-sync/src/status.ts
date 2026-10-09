import type { RemoteRecord } from '@sand/host-remotes/contract'
import type { Outcome } from './exchange'

const problems = {
  unreachable: 'is not reachable',
  refused: 'refused this PC',
  failed: 'could not sync projects',
}

export const createStatus = () => {
  const states = new Map<string, Outcome['state']>()
  return (record: RemoteRecord, outcome: Outcome) => {
    const previous = states.get(record.id)
    if (previous === outcome.state) return
    states.set(record.id, outcome.state)
    if (outcome.state !== 'ok') console.error(`project sync: ${record.name} ${problems[outcome.state]}: ${outcome.detail}`)
    else if (previous) console.error(`project sync: ${record.name} is back in sync`)
  }
}
