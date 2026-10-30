import type { Peers, PeerView } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import type { Registry } from '../registry/registry'
import { fingerprint } from './clean'
import { exchange } from './exchange'
import { createStatus } from './status'

interface Peer {
  pc: PeerView
  running: boolean
  again: boolean
  force: boolean
  agreed?: string
}

export const createRounds = (linked: () => Peers | undefined, projects: Registry) => {
  const peers = new Map<string, Peer>()
  const report = createStatus()
  let stopped = false

  const once = async (found: Peers, peer: Peer, force: boolean) => {
    const local = projects.all()
    if (!force && peer.agreed === fingerprint(local)) return
    const outcome = await exchange(found, peer.pc, local)
    if (stopped) return
    report(peer.pc, outcome)
    if (outcome.state !== 'ok') {
      peer.agreed = undefined
      return
    }
    peer.agreed = fingerprint(outcome.projects)
    await projects.merge(outcome.projects)
  }

  const run = async (found: Peers, peer: Peer) => {
    peer.running = true
    while (peer.again && !stopped) {
      const force = peer.force
      peer.again = false
      peer.force = false
      await once(found, peer, force).catch(error => console.error(`project sync: ${peer.pc.name}: ${errorMessage(error)}`))
    }
    peer.running = false
  }

  const trigger = (found: Peers, pc: PeerView, force: boolean) => {
    const peer = peers.get(pc.id) ?? { pc, running: false, again: false, force: false }
    peers.set(pc.id, peer)
    peer.pc = pc
    peer.again = true
    peer.force ||= force
    if (!peer.running) void run(found, peer)
  }

  const round = (force: boolean) => {
    const found = linked()
    if (stopped || !found) return
    const pcs = found.list()
    for (const [id, peer] of peers) if (!peer.running && !pcs.some(pc => pc.id === id)) peers.delete(id)
    for (const pc of pcs) trigger(found, pc, force)
  }

  const pull = async () => {
    const found = linked()
    if (!found) return
    const outcomes = await Promise.all(found.list().map(pc => exchange(found, pc, projects.all())))
    for (const outcome of outcomes) if (outcome.state === 'ok') await projects.merge(outcome.projects)
  }

  return {
    pull,
    round,
    stop() {
      stopped = true
    },
  }
}
