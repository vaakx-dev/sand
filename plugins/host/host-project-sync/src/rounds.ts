import type { HostProjects } from '@sand/host-projects/contract'
import type { RemoteRecord } from '@sand/host-remotes/contract'
import { errorMessage } from '@sand/kit'
import { remoteStore } from '@sand/kit/host'
import { fingerprint } from './clean'
import { exchange } from './exchange'
import { createStatus } from './status'

interface Peer {
  record: RemoteRecord
  running: boolean
  again: boolean
  force: boolean
  agreed?: string
}

export const createRounds = (home: string, projects: HostProjects) => {
  const peers = new Map<string, Peer>()
  const sockets = new Set<WebSocket>()
  const report = createStatus()
  let stopped = false

  const once = async (peer: Peer, force: boolean) => {
    const local = projects.all()
    if (!force && peer.agreed === fingerprint(local)) return
    const outcome = await exchange(peer.record, local, sockets)
    if (stopped) return
    report(peer.record, outcome)
    if (outcome.state !== 'ok') {
      peer.agreed = undefined
      return
    }
    peer.agreed = fingerprint(outcome.projects)
    await projects.merge(outcome.projects)
  }

  const run = async (peer: Peer) => {
    peer.running = true
    while (peer.again && !stopped) {
      const force = peer.force
      peer.again = false
      peer.force = false
      await once(peer, force).catch(error => console.error(`project sync: ${peer.record.name}: ${errorMessage(error)}`))
    }
    peer.running = false
  }

  const trigger = (record: RemoteRecord, force: boolean) => {
    const peer = peers.get(record.id) ?? { record, running: false, again: false, force: false }
    peers.set(record.id, peer)
    peer.record = record
    peer.again = true
    peer.force ||= force
    if (!peer.running) void run(peer)
  }

  const round = async (force: boolean) => {
    const records = (await remoteStore(home)).list()
    if (stopped) return
    for (const [id, peer] of peers) if (!peer.running && !records.some(record => record.id === id)) peers.delete(id)
    for (const record of records) trigger(record, force)
  }

  return {
    round(force: boolean) {
      if (!stopped) void round(force).catch(error => console.error(`project sync: ${errorMessage(error)}`))
    },
    stop() {
      stopped = true
      for (const socket of sockets) socket.close()
    },
  }
}
