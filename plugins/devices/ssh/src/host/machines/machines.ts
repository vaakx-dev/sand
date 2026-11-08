import type { Peers } from '@sand/devices-contract'
import { attemptAnswers, type Attempt, type SetupDeps, setUp } from '../setup'
import type { Fleet } from './fleet'
import { peerConnected } from './peer'
import type { Secrets } from './secrets'
import type { Store } from './store'

export interface MachinesDeps extends SetupDeps {
  fleet: Fleet
  store: Store
  secrets: Secrets
  peers: Peers
  changed(): void
}

export const createMachines = (deps: MachinesDeps) => {
  const { fleet, store, secrets, peers } = deps
  const busy = new Set<string>()

  const alone = async <T>(key: string, label: string, work: () => Promise<T>) => {
    if (busy.has(key)) throw new Error(`sand is already connecting to ${label}`)
    busy.add(key)
    try {
      return await work()
    } finally {
      busy.delete(key)
    }
  }

  const link = async (pc: string, attempt: Attempt) => {
    const answers = attemptAnswers(attempt, secrets.of(pc), text => void secrets.drop(pc, text))
    await fleet.connect(pc, answers, attempt.signal)
    await peerConnected(peers, pc, attempt.signal)
  }

  const reconnect = (pc: string, attempt: Attempt) => {
    const machine = store.get(pc)
    if (!machine) return Promise.reject(new Error("That PC isn't one of your SSH machines"))
    return alone(pc, machine.name, () => link(pc, attempt))
  }

  const add = async (host: string, attempt: Attempt) => {
    const { machine, answers } = await setUp(deps, host, attempt)
    await fleet.add(machine, answers)
    deps.changed()
    attempt.progress(`Connecting to ${machine.name}…`)
    await fleet.connect(machine.pc, answers, attempt.signal)
    await peerConnected(peers, machine.pc, attempt.signal)
    return machine.pc
  }

  const connect = (host: string, attempt: Attempt) =>
    alone(host.toLowerCase(), host, async () => {
      const known = store.list().find(machine => machine.host === host)
      if (!known) return add(host, attempt)
      await link(known.pc, attempt)
      return known.pc
    })

  return { connect, reconnect }
}
